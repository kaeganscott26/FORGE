/*
 * Content Farm Plugin for Obsidian
 * Generated: 2026-07-06T19:42:29.965Z
 * Build: development
 */
"use strict";var Ji=Object.create;var dr=Object.defineProperty;var Xi=Object.getOwnPropertyDescriptor;var Zi=Object.getOwnPropertyNames;var ea=Object.getPrototypeOf,ta=Object.prototype.hasOwnProperty;var ra=(s,e)=>{for(var t in e)dr(s,t,{get:e[t],enumerable:!0})},ts=(s,e,t,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of Zi(e))!ta.call(s,n)&&n!==t&&dr(s,n,{get:()=>e[n],enumerable:!(r=Xi(e,n))||r.enumerable});return s};var rs=(s,e,t)=>(t=s!=null?Ji(ea(s)):{},ts(e||!s||!s.__esModule?dr(t,"default",{value:s,enumerable:!0}):t,s)),na=s=>ts(dr({},"__esModule",{value:!0}),s);var Yo={};ra(Yo,{default:()=>rn});module.exports=na(Yo);var g=require("obsidian");var as=rs(require("node:https")),Le=require("obsidian");function Rt(s){if(typeof s=="string")return s;if(typeof s=="number"||typeof s=="boolean")return String(s)}function sn(s){return typeof s=="object"&&s!==null&&!Array.isArray(s)}function ns(s){if(!s)return"";try{let e=new Date(s);if(isNaN(e.getTime()))return"";let t=e.getFullYear(),r=e.toLocaleDateString("en-US",{month:"short"}),n=e.getDate().toString().padStart(2,"0");return`${t}, ${r} ${n}`}catch(e){return console.warn("Failed to format date:",s,e),""}}function ss(s){return sn(s)?Rt(s.last_updated)??Rt(s.date)??"":""}function is(s){if(!sn(s))return"";let e=[],t=Rt(s.date);t&&e.push(`Published: ${t}`);let r=Rt(s.last_updated);return r&&e.push(`Updated: ${r}`),e.join(" | ")}var Mt=class{settings;promptsService;loadingInterval=null;constructor(e){this.settings=e,this.promptsService=e.promptsService}convertRecencyFilter(e){return!e||e===""?void 0:["day","week","month","year"].includes(e)?e:e.includes("year")?"year":"month"}processContentWithImages(e,t){if(!t||t.length===0)return e;console.debug(`\u{1F5BC}\uFE0F Processing ${t.length} images for content replacement`);let r=e,n=/\[IMAGE\s+(\d+):\s*(.*?)\]/gi,i=[],a;for(;(a=n.exec(e))!==null;){let[l,c,d]=a;console.debug(`\u{1F50D} Regex match found: "${l}" with number="${c}" description="${d}"`),c&&d?i.push({fullMatch:l,number:c.trim(),description:d.trim(),index:a.index}):console.debug(`\u26A0\uFE0F Invalid match - number: "${c}", description: "${d}"`)}if(i.length===0)return console.debug("\u{1F50D} No image markers found in content"),e;console.debug(`\u{1F50D} Found ${i.length} image markers in content`),i.sort((l,c)=>c.index-l.index);let o=0;return i.forEach(l=>{console.debug(`\u{1F50D} Processing image reference: "${l.fullMatch}" at index ${l.index}`);let c=parseInt(l.number)-1,d=t[c];if(d&&d.image_url){let p=`![${l.description||"Image"}](${d.image_url})`;r=r.replace(l.fullMatch,p),o++,console.debug(`\u{1F504} Replaced "${l.fullMatch}" with image markdown`)}else console.debug(`\u26A0\uFE0F No image found for index ${c} or no image_url`)}),console.debug(`\u2705 Replaced ${o} image markers with actual images`),r}findQueryHeaderEnd(e){let t=e.split(`
`),r=!1,n=-1,i=0;for(let o=0;o<t.length;o++){let l=t[o],c=i;if(l.match(/^\s*>\s*\[!.*?\]/)&&(r=!0),r&&l.trim()===""){n=i;break}if(r&&!l.match(/^\s*>/)){n=c;break}i+=l.length+1}if(n>0)return console.debug(`\u{1F50D} Query header ends at position ${n}`),n;let a=[/\*\*\*/,/^#\s/,/^##\s/,/^###\s/];for(let o of a){let l=e.match(o);if(l){let c=l.index||0;return console.debug(`\u{1F50D} Found header end pattern at position ${c}`),c}}return-1}processThinkBlocks(e){if(!e.includes("<think>"))return e;console.debug("\u{1F9E0} Processing think blocks in content");let t=e,r=/<think>([\s\S]*?)<\/think>/gi;return t=t.replace(r,(n,i)=>{let o=`> [!brain] **AI Reasoning Process**
> 
> ${i.trim().split(`
`).map(l=>l.trim()).filter(l=>l.length>0).join(`
`)}
> 
> ---
> *This shows the AI's internal reasoning before generating the response.*`;return console.debug("\u{1F9E0} Converted think block to callout"),o}),t}clearLoadingText(e){let t=e.getValue();if(/🔍 Deep Research Loading\.*$/gm.test(t)){let n=t.split(`
`),i=n.filter(a=>!a.includes("\u{1F50D} Deep Research Loading"));i.length!==n.length&&(e.setValue(i.join(`
`)),console.debug("\u{1F9F9} Cleared loading text from document"))}}clearLoadingAnimation(){this.loadingInterval&&(console.debug("\u{1F6D1} Clearing loading animation interval"),activeWindow.clearInterval(this.loadingInterval),this.loadingInterval=null)}addCitations(e,t){if(!t||t.length===0)return;console.debug(`\u{1F4DA} Processing ${t.length} sources for citations`);let r=e.getValue(),n=r.match(/### Citations\n\n([\s\S]*?)(?=\n\n\*\*\*|\n\n### |\n\n## |\n\n# |$)/),i="";n&&n[1]&&(i=n[1],console.debug("\u{1F4DA} Found existing citations section, will append to it"));let a="",o=1;if(i){let l=i.match(/\[(\d+)\]:/g),c=i.match(/\[\^[a-zA-Z0-9]+\]:/g);l&&l.length>0?o=Math.max(...l.map(p=>{let h=p.match(/\d+/);return h?parseInt(h[0]):0}))+1:(c&&c.length>0,o=1)}if(t.forEach((l,c)=>{let d,p,h="",u="";if(typeof l=="string")p=l,d="Source";else if(l&&typeof l=="object"){d=l.title||"Source",p=l.url||"#";let f=ss(l);f&&(h=ns(f)),u=is(l)}else d="Source",p="#";a+=`[${o+c}]: ${h?h+". ":""}[${d}](${p}).${u?" "+u:""}

`}),n){let l=i+a,c=r.indexOf("### Citations"),d=c+15+i.length,p=r.substring(0,c+15),h=r.substring(d),u=p+l+h;e.setValue(u),console.debug("\u2705 Citations appended to existing section")}else{let l=`

### Citations

`+a,c=e.lastLine(),d={line:c,ch:e.getLine(c).length};e.replaceRange(l,d),console.debug("\u2705 New citations section created")}}async queryPerplexity(e,t,r,n,i){console.debug("\u{1F680} PerplexityService.queryPerplexity called"),console.debug("\u{1F4CA} Parameters:",{model:t,stream:r,options:i,queryLength:e.length});let a=new Date().toISOString(),o=t==="sonar-deep-research",l=r;console.debug("\u{1F50D} Model analysis:",{isDeepResearch:o,useStreaming:l});let c=n.getCursor();console.debug("Initial cursor position:",c);let d=e.split(`
`).map(f=>`> ${f}`).join(`
`),p=o?`

***
> [!info] **Perplexity Deep Research Query** (${a})
> **Question:**
${d}
> **Model:** ${t}
> 
> \u{1F50D} **Conducting exhaustive research across hundreds of sources...**
> *This may take 30-60 seconds for comprehensive analysis.*
> 
>`:`

***
> [!info] **Perplexity Query** (${a})
> **Question:**
${d}
> 
> **Model:** ${t}
> 
>`,h;if(this.settings.headerPosition==="bottom")h=c;else{n.replaceRange(p,c,c);let f=p.split(`
`),v=f[f.length-1]||"";h={line:c.line+f.length-1,ch:v.length}}console.debug("Response cursor position:",h),console.debug("Header position setting:",this.settings.headerPosition),console.debug("Header text preview:",p?p.substring(0,100)+"...":"No header text");let u=null;o&&(u=new Le.Notice(this.promptsService?.getDeepResearchLoadingNotice()||"\u{1F50D} Deep research in progress... This may take up to 60 seconds.",0));try{let f=this.convertRecencyFilter(i?.search_recency_filter??"month"),S=[{role:"system",content:"When you make any factual claim that comes from a web search result, append a numeric citation marker like [1], [2], etc. immediately after the claim. The numbers MUST correspond 1:1 to the order of the search results returned by the search tool (first result = [1], second = [2], and so on). You may cite the same source multiple times. Do not list the sources at the end \u2014 only inline markers. Do not invent sources; only cite results actually used."},{role:"user",content:e}],T;if(this.settings.requestTemplate)try{let y=(this.promptsService?.processTemplate(this.settings.requestTemplate)||this.settings.requestTemplate).replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/.*$/gm,"").replace(/^\s*$/gm,"").trim();if(y.includes("const ")||y.includes("fetch(")||y.includes("await ")){console.warn("\u26A0\uFE0F Template contains JavaScript code, not JSON. Extracting payload object...");let P=y.match(/payload\s*=\s*({[\s\S]*?});/);if(P){let A=P[1];console.debug("\u{1F50D} Extracted payload from JavaScript:",A),A=A?.replace(/(\w+):/g,'"$1":').replace(/'/g,'"'),y=A??y}else throw new Error("Template contains JavaScript code but no valid payload object found. Please use JSON format only.")}console.debug("\u{1F9F9} Final cleaned template:",y),JSON.parse(y),T={model:t,messages:S,stream:l,return_citations:i?.return_citations??!0,return_images:i?.return_images??!0,return_related_questions:i?.return_related_questions??!1}}catch(w){console.warn("Failed to parse request template, using default payload:",w),T={model:t,messages:S,stream:l,return_citations:i?.return_citations??!0,return_images:i?.return_images??!0,return_related_questions:i?.return_related_questions??!1}}else T={model:t,messages:S,stream:l,return_citations:i?.return_citations??!0,return_images:i?.return_images??!0,return_related_questions:i?.return_related_questions??!1};f!==void 0&&(T.search_recency_filter=f);let I=Date.now()+Math.random();console.debug(`\u{1F680} Perplexity API Payload [${I}]:`,JSON.stringify(T,null,2));try{if(l){console.debug("\u{1F504} Making streaming API request via Node.js https (CORS bypass)...");let w=new URL(this.settings.perplexityEndpoint),y=await new Promise((C,R)=>{let M=as.request({hostname:w.hostname,path:w.pathname+w.search,method:"POST",headers:{Authorization:`Bearer ${this.settings.perplexityApiKey}`,"Content-Type":"application/json",Accept:"text/event-stream"}},D=>{if(D.statusCode!==void 0&&D.statusCode>=400){let q="";D.on("data",B=>{q+=B.toString()}),D.on("end",()=>{R(new Error(`HTTP error! status: ${D.statusCode} \u2014 ${q}`))});return}C(D)});M.on("error",R),M.write(JSON.stringify(T)),M.end()}),A={ok:!0,body:new ReadableStream({start(C){y.on("data",R=>{C.enqueue(R)}),y.on("end",()=>{C.close()}),y.on("error",R=>{C.error(R)})}})};console.debug("\u2705 Streaming response via Node.js ready, handling SSE..."),await this.handleStreamingResponse(A,n,h,I,p,o)}else{console.debug("\u{1F504} Making non-streaming API request...");let w=await(0,Le.request)({url:this.settings.perplexityEndpoint,method:"POST",headers:{Authorization:`Bearer ${this.settings.perplexityApiKey}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(T)});console.debug("\u2705 Non-streaming response received");let y=JSON.parse(w);if(console.debug("\u{1F4CA} Response data structure:",Object.keys(y)),y.choices&&y.choices.length>0){let P=y.choices[0]?.message?.content??"";if(P=this.processThinkBlocks(P),i?.return_images&&y.images&&y.images.length>0&&(console.debug("\u{1F5BC}\uFE0F Processing images in non-streaming response:",y.images.length,"images found"),P=this.processContentWithImages(P,y.images)),n.replaceRange(P,h),i?.return_citations&&(y.search_results&&y.search_results.length>0?this.addCitations(n,y.search_results):y.citations&&y.citations.length>0&&this.addCitations(n,y.citations)),this.settings.headerPosition==="bottom"){let A=n.lastLine(),C={line:A,ch:n.getLine(A).length};n.replaceRange(`

`+p,C)}}n.replaceRange(`

***
`,h)}}catch(w){console.error("Error making request to Perplexity API:",w);let y=w instanceof Error?w.message:String(w);new Le.Notice(`Perplexity Error: ${y}`),this.clearLoadingText(n),this.clearLoadingAnimation(),n.replaceRange(`
**Error:** ${y}

***
`,n.getCursor())}finally{u&&u.hide()}}catch(f){let v=f instanceof Error?f.message:String(f);new Le.Notice(`Perplexity Error: ${v}`),this.clearLoadingText(n),this.clearLoadingAnimation(),n.replaceRange(`
**Error:** ${v}

***
`,n.getCursor()),u&&u.hide()}}async handleStreamingResponse(e,t,r,n,i,a=!1){console.debug("\u{1F504} handleStreamingResponse called");let o=e.body?.getReader();if(!o)throw new Error("No response body");console.debug(`\u{1F504} Starting streaming response handler [${n||"unknown"}]`);let l=new TextDecoder,c="",d={...r},p=null,h="",u=a?27e4:9e4,f=()=>{let v,S=new Promise((T,I)=>{v=window.setTimeout(()=>{I(new Error(`stream went idle for ${u/1e3}s (likely API stall, rate limit, or socket close)`))},u)});return Promise.race([o.read(),S]).finally(()=>{v!==void 0&&window.clearTimeout(v)})};console.debug("\u{1F4CD} Initial currentPos:",d);try{for(;;){let{done:T,value:I}=await f();if(T)break;let w=l.decode(I,{stream:!0});c+=w;let y=c.split(`
`);c=y.pop()||"";for(let P of y)if(P.trim()!=="")try{if(P.startsWith("data: ")){let A=P.replace("data: ","").trim();if(A==="[DONE]")continue;let C=JSON.parse(A);(C.citations||C.images||C.search_results)&&(p={...p||{},...C});let R=C.choices?.[0],M;if(typeof R?.message?.content=="string"?M=R.message.content:typeof R?.delta?.content=="string"&&(M=h+R.delta.content),M&&M.length>h.length&&M.startsWith(h)){let D=M.slice(h.length);this.clearLoadingText(t),this.clearLoadingAnimation(),t.replaceRange(D,d);let q=D.split(`
`);q.length===1?d.ch+=D.length:(d.line+=q.length-1,d.ch=q[q.length-1]?.length??0),t.scrollIntoView({from:d,to:d},!0),h=M}}}catch(A){console.warn("Error processing streaming chunk:",A)}await new Promise(P=>activeWindow.setTimeout(P,10))}p&&(console.debug(`\u{1F4DD} Processing final response data [${n||"unknown"}]:`,p),this.processStreamingMetadata(p,t,i));let v=t.lastLine(),S={line:v,ch:t.getLine(v).length};t.replaceRange(`

***
`,S),this.clearLoadingAnimation()}catch(v){console.error("Error in streaming response:",v);let S=v instanceof Error?v.message:"Unknown error during streaming",T=/NETWORK_CHANGED|network changed/i.test(S),I=/failed to fetch|load failed|socket|ECONNRESET/i.test(S),w=/went idle/i.test(S),y=/AbortError|aborted/i.test(S),P;if(T?P="Network changed mid-stream (WiFi flip, VPN reconnect, or sleep/wake). Re-run the query \u2014 no partial response was saved.":w?P="Perplexity stream stalled (likely API back-pressure or rate limit). Re-run the query; if it stalls again, try a smaller prompt or a non-research model.":y?P="Request aborted.":I?P=`Connection dropped before Perplexity finished. Re-run the query. (raw: ${S})`:P=`Streaming error: ${S}`,new Le.Notice(P),this.clearLoadingText(t),this.clearLoadingAnimation(),p)try{this.processStreamingMetadata(p,t,i)}catch(A){console.warn("Could not salvage streaming metadata:",A)}t.replaceRange(`
**Streaming Error:** ${P}

`,d)}}processStreamingMetadata(e,t,r){console.debug("\u{1F50D} Processing streaming metadata"),console.debug("\u{1F4CA} Response data keys:",Object.keys(e||{})),e.images&&console.debug(`\u{1F5BC}\uFE0F Images array length: ${e.images.length}`),e.search_results&&console.debug(`\u{1F4DA} Search results array length: ${e.search_results.length}`);let n=t.getValue(),i=!1,a=this.processThinkBlocks(n);if(a!==n&&(n=a,i=!0,console.debug("\u{1F9E0} Think blocks processed in streaming response")),e.images&&e.images.length>0){console.debug("\u{1F5BC}\uFE0F Processing images in streaming response:",e.images.length,"images found");let o=/\[IMAGE\s+(\d+):\s*(.*?)\]/gi,l=n.match(o);console.debug("\u{1F50D} All image references found in content:",l);let c=n.substring(0,Math.min(500,n.length));console.debug("\u{1F50D} Sample content:",c);let d=this.processContentWithImages(n,e.images);if(d!==n)n=d,i=!0,console.debug("\u{1F504} Content updated with inline images (streaming)");else{console.debug("\u26A0\uFE0F No image markers were replaced, falling back to Images section");let p=this.findQueryHeaderEnd(n);if(p>0){console.debug(`\u{1F4CD} Found query header end at position ${p}, inserting images inline`);let h=`

`;e.images.forEach((S,T)=>{S.image_url&&(h+=`![Image ${T+1}](${S.image_url})

`)});let u=n.substring(0,p),f=n.substring(p),v=u+h+f;t.setValue(v),i=!0,console.debug("\u{1F504} Images inserted inline after query header")}else{let h=`

## Images

`;e.images.forEach((v,S)=>{v.image_url&&(h+=`![Image ${S+1}](${v.image_url})
`,v.origin_url?h+=`*Source: ${v.origin_url}*

`:h+=`
`)});let u=t.lastLine(),f={line:u,ch:t.getLine(u).length};t.replaceRange(h,f)}}}else console.debug("\u{1F5BC}\uFE0F No images found in streaming response data"),console.debug("\u{1F4A1} Note: Deep Research with streaming may not support images. Consider using non-streaming mode for image support.");if(i&&(t.setValue(n),console.debug("\u{1F504} Editor updated with processed content (think blocks and/or images)")),e.search_results&&e.search_results.length>0?this.addCitations(t,e.search_results):e.citations&&e.citations.length>0?this.addCitations(t,e.citations):console.debug("\u{1F4DA} No sources/citations found in Perplexity streaming response"),this.settings.headerPosition==="bottom"&&r){console.debug("\u{1F4C4} Adding header at bottom of document");let o=t.lastLine(),l={line:o,ch:t.getLine(o).length};console.debug("\u{1F4CD} End position for header:",l),t.replaceRange(`

`+r,l),console.debug("\u2705 Header added at bottom")}else console.debug("\u{1F4C4} Header position setting:",this.settings.headerPosition,"Header text available:",!!r)}};var os=require("obsidian"),Nt=class{settings;promptsService;constructor(e){this.settings=e,this.promptsService=e.promptsService}processContentWithImages(e){let t=/\[IMAGE\s+(\d+):\s*(.*?)\]/gi,r,n=0;for(;(r=t.exec(e))!==null;){let i=r[2]?.trim()||"",a=`

![${i}](https://via.placeholder.com/600x400/cccccc/666666?text=${encodeURIComponent(i)})
*${i}*
`;e=e.replace(r[0],a),n++}return n>0&&console.debug(`\u{1F504} Processed ${n} image markers in Perplexica content`),e}async queryPerplexica(e,t,r,n,i,a){let o=new Date().toISOString(),l=i.getCursor(),c=e.split(`
`).map(p=>`> ${p}`).join(`
`);i.replaceRange(`

***
> [!info] **Perplexica / Vane Query** (${o})
> **Question:**
${c}
> **Focus:** ${t}
> **Optimization:** ${r}
> 
> ### **Response from Perplexica / Vane**:

`,l);let d=i.getCursor();try{let p=[this.settings.perplexicaEndpoint,this.settings.localLLMPath],h;for(let u of p)try{let f;if(this.settings.requestTemplate)try{let T=(this.promptsService?.processTemplate(this.settings.requestTemplate)||this.settings.requestTemplate).replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/.*$/gm,"").replace(/^\s*$/gm,"").trim();JSON.parse(T),f={chatModel:{provider:"ollama",name:this.settings.defaultModel},embeddingModel:{provider:"ollama",name:this.settings.defaultModel},optimizationMode:r,focusMode:t,query:e,history:[{role:"user",content:e}],systemInstructions:this.promptsService?.getPerplexicaSystemPrompt()||"You are a helpful AI assistant. Provide clear, concise, and accurate information.",stream:n}}catch(S){console.warn("Failed to parse request template, using default payload:",S),f={chatModel:{provider:"ollama",name:this.settings.defaultModel},embeddingModel:{provider:"ollama",name:this.settings.defaultModel},optimizationMode:r,focusMode:t,query:e,history:[{role:"user",content:e}],systemInstructions:this.promptsService?.getPerplexicaSystemPrompt()||"You are a helpful AI assistant. Provide clear, concise, and accurate information.",stream:n,maxTokens:2048,temperature:.7}}else f={chatModel:{provider:"ollama",name:this.settings.defaultModel},embeddingModel:{provider:"ollama",name:this.settings.defaultModel},optimizationMode:r,focusMode:t,query:e,history:[{role:"user",content:e}],systemInstructions:this.promptsService?.getPerplexicaSystemPrompt()||"You are a helpful AI assistant. Provide clear, concise, and accurate information.",stream:n,maxTokens:2048,temperature:.7};let v=await activeWindow.fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});if(!v.ok)throw new Error(`HTTP error! status: ${v.status}`);n?await this.handleStreamingResponse(v,i,d,a):await this.handleNonStreamingResponse(v,i,d,a),i.replaceRange(`

***
`,i.getCursor());return}catch(f){h=f,console.warn(`Failed to connect to ${u}:`,f)}throw h instanceof Error?h:new Error("All endpoints failed")}catch(p){let h=p instanceof Error?p.message:String(p);new os.Notice(`Perplexica / Vane Error: ${h}`),i.replaceRange(`
**Error:** ${h}

***
`,i.getCursor())}}async handleStreamingResponse(e,t,r,n){let i=e.body?.getReader();if(!i)throw new Error("No response body");let a=r;for(;;){let{done:o,value:l}=await i.read();if(o)break;let d=new TextDecoder().decode(l).split(`
`).filter(p=>p.trim());for(let p of d)try{let h=JSON.parse(p);if(h.type==="response"&&typeof h.data=="string"){let u=h.data;n?.return_images&&(u=this.processContentWithImages(u)),t.replaceRange(u,a);let f=u.split(`
`);f.length===1?a={line:a.line,ch:a.ch+u.length}:a={line:a.line+f.length-1,ch:f[f.length-1]?.length||0},t.scrollIntoView({from:a,to:a},!0),await new Promise(v=>activeWindow.setTimeout(v,10))}}catch{}}}async handleNonStreamingResponse(e,t,r,n){let i=await e.text(),a=i;n?.return_images&&(a=this.processContentWithImages(i)),t.replaceRange(a,r)}};var ls=require("obsidian"),Ot=class{settings;promptsService;constructor(e){this.settings=e,this.promptsService=e.promptsService}processContentWithImages(e){let t=/\[IMAGE\s+(\d+):\s*(.*?)\]/gi,r,n=0;for(;(r=t.exec(e))!==null;){let i=r[2]?.trim()||"",a=`

![${i}](https://via.placeholder.com/600x400/cccccc/666666?text=${encodeURIComponent(i)})
*${i}*
`;e=e.replace(r[0],a),n++}return n>0&&console.debug(`\u{1F504} Processed ${n} image markers in LM Studio content`),e}async queryLMStudio(e,t,r,n,i){let a=new Date().toISOString(),o=n.getCursor();console.debug("Initial cursor position:",o);let l=e.split(`
`).map(u=>`> ${u}`).join(`
`),c=`

***
> [!info] **LM Studio Query** (${a})
> **Question:**
${l}
> **Model:** ${t}
> 
> ### **Response from ${t}**:

`;n.replaceRange(c,o,o);let d=c.split(`
`),p=d[d.length-1]||"",h={line:o.line+d.length-1,ch:p.length};console.debug("Response cursor position:",h);try{let u=[];i?.system_prompt&&u.push({role:"system",content:i.system_prompt}),u.push({role:"user",content:e});let f;if(this.settings.requestTemplate)try{let I=(this.promptsService?.processTemplate(this.settings.requestTemplate)||this.settings.requestTemplate).replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/.*$/gm,"").replace(/^\s*$/gm,"").trim();JSON.parse(I),f={model:t,messages:u,stream:r,max_tokens:i?.max_tokens??2048,temperature:i?.temperature??.7,top_p:i?.top_p??.9}}catch(T){console.warn("Failed to parse request template, using default payload:",T),f={model:t,messages:u,stream:r,max_tokens:i?.max_tokens??2048,temperature:i?.temperature??.7,top_p:i?.top_p??.9}}else f={model:t,messages:u,stream:r,max_tokens:i?.max_tokens??2048,temperature:i?.temperature??.7,top_p:i?.top_p??.9};let v=await activeWindow.fetch(this.settings.lmStudioEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});if(!v.ok)throw new Error(`HTTP error! status: ${v.status}`);let S=h;r?await this.handleStreamingResponse(v,n,h,i):await this.handleNonStreamingResponse(v,n,h,i),n.replaceRange(`

***
`,S)}catch(u){let f=u instanceof Error?u.message:String(u);new ls.Notice(`LM Studio Error: ${f}`),n.replaceRange(`
**Error:** ${f}

***
`,n.getCursor())}}async handleStreamingResponse(e,t,r,n){let i=e.body?.getReader();if(!i)throw new Error("No response body");let a="",o=r;for(;;){let{done:l,value:c}=await i.read();if(l)break;let d=new TextDecoder().decode(c);a+=d;let p=a.split(`
`);a=p.pop()||"";for(let h of p)if(h.trim().startsWith("data: ")){let u=h.replace("data: ","").trim();if(u==="[DONE]")continue;try{let f=JSON.parse(u);if(f.choices?.[0]?.delta?.content){let v=f.choices[0].delta.content;n?.return_images&&(v=this.processContentWithImages(v)),t.replaceRange(v,o);let S=v.split(`
`);S.length===1?o={line:o.line,ch:o.ch+v.length}:o={line:o.line+S.length-1,ch:S[S.length-1]?.length||0},t.scrollIntoView({from:o,to:o},!0),await new Promise(T=>activeWindow.setTimeout(T,10))}}catch{}}}}async handleNonStreamingResponse(e,t,r,n){let a=(await e.json()).choices?.[0]?.message?.content||"No response received",o=a;n?.return_images&&(o=this.processContentWithImages(a)),t.replaceRange(o,r)}};function k(s,e,t,r,n){if(r==="m")throw new TypeError("Private method is not writable");if(r==="a"&&!n)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?s!==e||!n:!e.has(s))throw new TypeError("Cannot write private member to an object whose class did not declare it");return r==="a"?n.call(s,t):n?n.value=t:e.set(s,t),t}function m(s,e,t,r){if(t==="a"&&!r)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?s!==e||!r:!e.has(s))throw new TypeError("Cannot read private member from an object whose class did not declare it");return t==="m"?r:t==="a"?r.call(s):r?r.value:e.get(s)}var an=function(){let{crypto:s}=globalThis;if(s?.randomUUID)return an=s.randomUUID.bind(s),s.randomUUID();let e=new Uint8Array(1),t=s?()=>s.getRandomValues(e)[0]:()=>Math.random()*255&255;return"10000000-1000-4000-8000-100000000000".replace(/[018]/g,r=>(+r^t()&15>>+r/4).toString(16))};function be(s){return typeof s=="object"&&s!==null&&("name"in s&&s.name==="AbortError"||"message"in s&&String(s.message).includes("FetchRequestCanceledException"))}var Dt=s=>{if(s instanceof Error)return s;if(typeof s=="object"&&s!==null){try{if(Object.prototype.toString.call(s)==="[object Error]"){let e=new Error(s.message,s.cause?{cause:s.cause}:{});return s.stack&&(e.stack=s.stack),s.cause&&!e.cause&&(e.cause=s.cause),s.name&&(e.name=s.name),e}}catch{}try{return new Error(JSON.stringify(s))}catch{}}return new Error(s)};var _=class extends Error{},W=class s extends _{constructor(e,t,r,n,i){super(`${s.makeMessage(e,t,r)}`),this.status=e,this.headers=n,this.requestID=n?.get("request-id"),this.error=t,this.type=i??null}static makeMessage(e,t,r){let n=t?.message?typeof t.message=="string"?t.message:JSON.stringify(t.message):t?JSON.stringify(t):r;return e&&n?`${e} ${n}`:e?`${e} status code (no body)`:n||"(no status code or body)"}static generate(e,t,r,n){if(!e||!n)return new Ee({message:r,cause:Dt(t)});let i=t,a=i?.error?.type;return e===400?new Je(e,i,r,n,a):e===401?new Xe(e,i,r,n,a):e===403?new Ze(e,i,r,n,a):e===404?new et(e,i,r,n,a):e===409?new tt(e,i,r,n,a):e===422?new rt(e,i,r,n,a):e===429?new nt(e,i,r,n,a):e>=500?new st(e,i,r,n,a):new s(e,i,r,n,a)}},H=class extends W{constructor({message:e}={}){super(void 0,void 0,e||"Request was aborted.",void 0)}},Ee=class extends W{constructor({message:e,cause:t}){super(void 0,void 0,e||"Connection error.",void 0),t&&(this.cause=t)}},Ye=class extends Ee{constructor({message:e}={}){super({message:e??"Request timed out."})}},Je=class extends W{},Xe=class extends W{},Ze=class extends W{},et=class extends W{},tt=class extends W{},rt=class extends W{},nt=class extends W{},st=class extends W{};var ia=/^[a-z][a-z0-9+.-]*:/i,cs=s=>ia.test(s),on=s=>(on=Array.isArray,on(s)),ln=on;function pr(s){return typeof s!="object"?{}:s??{}}function cn(s){if(!s)return!0;for(let e in s)return!1;return!0}function ds(s,e){return Object.prototype.hasOwnProperty.call(s,e)}var ps=(s,e)=>{if(typeof e!="number"||!Number.isInteger(e))throw new _(`${s} must be an integer`);if(e<0)throw new _(`${s} must be a positive integer`);return e};var ur=s=>{try{return JSON.parse(s)}catch{return}};var us=s=>new Promise(e=>setTimeout(e,s));var Ae="0.92.0";var fs=()=>typeof window<"u"&&typeof window.document<"u"&&typeof navigator<"u";function aa(){return typeof Deno<"u"&&Deno.build!=null?"deno":typeof EdgeRuntime<"u"?"edge":Object.prototype.toString.call(typeof globalThis.process<"u"?globalThis.process:0)==="[object process]"?"node":"unknown"}var oa=()=>{let s=aa();if(s==="deno")return{"X-Stainless-Lang":"js","X-Stainless-Package-Version":Ae,"X-Stainless-OS":ms(Deno.build.os),"X-Stainless-Arch":hs(Deno.build.arch),"X-Stainless-Runtime":"deno","X-Stainless-Runtime-Version":typeof Deno.version=="string"?Deno.version:Deno.version?.deno??"unknown"};if(typeof EdgeRuntime<"u")return{"X-Stainless-Lang":"js","X-Stainless-Package-Version":Ae,"X-Stainless-OS":"Unknown","X-Stainless-Arch":`other:${EdgeRuntime}`,"X-Stainless-Runtime":"edge","X-Stainless-Runtime-Version":globalThis.process.version};if(s==="node")return{"X-Stainless-Lang":"js","X-Stainless-Package-Version":Ae,"X-Stainless-OS":ms(globalThis.process.platform??"unknown"),"X-Stainless-Arch":hs(globalThis.process.arch??"unknown"),"X-Stainless-Runtime":"node","X-Stainless-Runtime-Version":globalThis.process.version??"unknown"};let e=la();return e?{"X-Stainless-Lang":"js","X-Stainless-Package-Version":Ae,"X-Stainless-OS":"Unknown","X-Stainless-Arch":"unknown","X-Stainless-Runtime":`browser:${e.browser}`,"X-Stainless-Runtime-Version":e.version}:{"X-Stainless-Lang":"js","X-Stainless-Package-Version":Ae,"X-Stainless-OS":"Unknown","X-Stainless-Arch":"unknown","X-Stainless-Runtime":"unknown","X-Stainless-Runtime-Version":"unknown"}};function la(){if(typeof navigator>"u"||!navigator)return null;let s=[{key:"edge",pattern:/Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{key:"ie",pattern:/MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{key:"ie",pattern:/Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/},{key:"chrome",pattern:/Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{key:"firefox",pattern:/Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/},{key:"safari",pattern:/(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/}];for(let{key:e,pattern:t}of s){let r=t.exec(navigator.userAgent);if(r){let n=r[1]||0,i=r[2]||0,a=r[3]||0;return{browser:e,version:`${n}.${i}.${a}`}}}return null}var hs=s=>s==="x32"?"x32":s==="x86_64"||s==="x64"?"x64":s==="arm"?"arm":s==="aarch64"||s==="arm64"?"arm64":s?`other:${s}`:"unknown",ms=s=>(s=s.toLowerCase(),s.includes("ios")?"iOS":s==="android"?"Android":s==="darwin"?"MacOS":s==="win32"?"Windows":s==="freebsd"?"FreeBSD":s==="openbsd"?"OpenBSD":s==="linux"?"Linux":s?`Other:${s}`:"Unknown"),gs,ys=()=>gs??(gs=oa());function bs(){if(typeof fetch<"u")return fetch;throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`")}function dn(...s){let e=globalThis.ReadableStream;if(typeof e>"u")throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");return new e(...s)}function hr(s){let e=Symbol.asyncIterator in s?s[Symbol.asyncIterator]():s[Symbol.iterator]();return dn({start(){},async pull(t){let{done:r,value:n}=await e.next();r?t.close():t.enqueue(n)},async cancel(){await e.return?.()}})}function Lt(s){if(s[Symbol.asyncIterator])return s;let e=s.getReader();return{async next(){try{let t=await e.read();return t?.done&&e.releaseLock(),t}catch(t){throw e.releaseLock(),t}},async return(){let t=e.cancel();return e.releaseLock(),await t,{done:!0,value:void 0}},[Symbol.asyncIterator](){return this}}}async function ws(s){if(s===null||typeof s!="object")return;if(s[Symbol.asyncIterator]){await s[Symbol.asyncIterator]().return?.();return}let e=s.getReader(),t=e.cancel();e.releaseLock(),await t}var vs=({headers:s,body:e})=>({bodyHeaders:{"content-type":"application/json"},body:JSON.stringify(e)});function Ss(s){return Object.entries(s).filter(([e,t])=>typeof t<"u").map(([e,t])=>{if(typeof t=="string"||typeof t=="number"||typeof t=="boolean")return`${encodeURIComponent(e)}=${encodeURIComponent(t)}`;if(t===null)return`${encodeURIComponent(e)}=`;throw new _(`Cannot stringify type ${typeof t}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`)}).join("&")}function ks(s){let e=0;for(let n of s)e+=n.length;let t=new Uint8Array(e),r=0;for(let n of s)t.set(n,r),r+=n.length;return t}var xs;function Ft(s){let e;return(xs??(e=new globalThis.TextEncoder,xs=e.encode.bind(e)))(s)}var Ps;function pn(s){let e;return(Ps??(e=new globalThis.TextDecoder,Ps=e.decode.bind(e)))(s)}var ee,te,we=class{constructor(){ee.set(this,void 0),te.set(this,void 0),k(this,ee,new Uint8Array,"f"),k(this,te,null,"f")}decode(e){if(e==null)return[];let t=e instanceof ArrayBuffer?new Uint8Array(e):typeof e=="string"?Ft(e):e;k(this,ee,ks([m(this,ee,"f"),t]),"f");let r=[],n;for(;(n=pa(m(this,ee,"f"),m(this,te,"f")))!=null;){if(n.carriage&&m(this,te,"f")==null){k(this,te,n.index,"f");continue}if(m(this,te,"f")!=null&&(n.index!==m(this,te,"f")+1||n.carriage)){r.push(pn(m(this,ee,"f").subarray(0,m(this,te,"f")-1))),k(this,ee,m(this,ee,"f").subarray(m(this,te,"f")),"f"),k(this,te,null,"f");continue}let i=m(this,te,"f")!==null?n.preceding-1:n.preceding,a=pn(m(this,ee,"f").subarray(0,i));r.push(a),k(this,ee,m(this,ee,"f").subarray(n.index),"f"),k(this,te,null,"f")}return r}flush(){return m(this,ee,"f").length?this.decode(`
`):[]}};ee=new WeakMap,te=new WeakMap;we.NEWLINE_CHARS=new Set([`
`,"\r"]);we.NEWLINE_REGEXP=/\r\n|[\n\r]/g;function pa(s,e){for(let n=e??0;n<s.length;n++){if(s[n]===10)return{preceding:n,index:n+1,carriage:!1};if(s[n]===13)return{preceding:n,index:n+1,carriage:!0}}return null}function _s(s){for(let r=0;r<s.length-1;r++){if(s[r]===10&&s[r+1]===10||s[r]===13&&s[r+1]===13)return r+2;if(s[r]===13&&s[r+1]===10&&r+3<s.length&&s[r+2]===13&&s[r+3]===10)return r+4}return-1}var gr={off:0,error:200,warn:300,info:400,debug:500},un=(s,e,t)=>{if(s){if(ds(gr,s))return s;G(t).warn(`${e} was set to ${JSON.stringify(s)}, expected one of ${JSON.stringify(Object.keys(gr))}`)}};function $t(){}function mr(s,e,t){return!e||gr[s]>gr[t]?$t:e[s].bind(e)}var ua={error:$t,warn:$t,info:$t,debug:$t},Ts=new WeakMap;function G(s){let e=s.logger,t=s.logLevel??"off";if(!e)return ua;let r=Ts.get(e);if(r&&r[0]===t)return r[1];let n={error:mr("error",e,t),warn:mr("warn",e,t),info:mr("info",e,t),debug:mr("debug",e,t)};return Ts.set(e,[t,n]),n}var ve=s=>(s.options&&(s.options={...s.options},delete s.options.headers),s.headers&&(s.headers=Object.fromEntries((s.headers instanceof Headers?[...s.headers]:Object.entries(s.headers)).map(([e,t])=>[e,e.toLowerCase()==="x-api-key"||e.toLowerCase()==="authorization"||e.toLowerCase()==="cookie"||e.toLowerCase()==="set-cookie"?"***":t]))),"retryOfRequestLogID"in s&&(s.retryOfRequestLogID&&(s.retryOf=s.retryOfRequestLogID),delete s.retryOfRequestLogID),s);var qt,he=class s{constructor(e,t,r){this.iterator=e,qt.set(this,void 0),this.controller=t,k(this,qt,r,"f")}static fromSSEResponse(e,t,r){let n=!1,i=r?G(r):console;async function*a(){if(n)throw new _("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");n=!0;let o=!1;try{for await(let l of ha(e,t)){if(l.event==="completion")try{yield JSON.parse(l.data)}catch(c){throw i.error("Could not parse message into JSON:",l.data),i.error("From chunk:",l.raw),c}if(l.event==="message_start"||l.event==="message_delta"||l.event==="message_stop"||l.event==="content_block_start"||l.event==="content_block_delta"||l.event==="content_block_stop"||l.event==="message"||l.event==="user.message"||l.event==="user.interrupt"||l.event==="user.tool_confirmation"||l.event==="user.custom_tool_result"||l.event==="agent.message"||l.event==="agent.thinking"||l.event==="agent.tool_use"||l.event==="agent.tool_result"||l.event==="agent.mcp_tool_use"||l.event==="agent.mcp_tool_result"||l.event==="agent.custom_tool_use"||l.event==="agent.thread_context_compacted"||l.event==="session.status_running"||l.event==="session.status_idle"||l.event==="session.status_rescheduled"||l.event==="session.status_terminated"||l.event==="session.error"||l.event==="session.deleted"||l.event==="span.model_request_start"||l.event==="span.model_request_end")try{yield JSON.parse(l.data)}catch(c){throw i.error("Could not parse message into JSON:",l.data),i.error("From chunk:",l.raw),c}if(l.event!=="ping"&&l.event==="error"){let c=ur(l.data)??l.data,d=c?.error?.type;throw new W(void 0,c,void 0,e.headers,d)}}o=!0}catch(l){if(be(l))return;throw l}finally{o||t.abort()}}return new s(a,t,r)}static fromReadableStream(e,t,r){let n=!1;async function*i(){let o=new we,l=Lt(e);for await(let c of l)for(let d of o.decode(c))yield d;for(let c of o.flush())yield c}async function*a(){if(n)throw new _("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");n=!0;let o=!1;try{for await(let l of i())o||l&&(yield JSON.parse(l));o=!0}catch(l){if(be(l))return;throw l}finally{o||t.abort()}}return new s(a,t,r)}[(qt=new WeakMap,Symbol.asyncIterator)](){return this.iterator()}tee(){let e=[],t=[],r=this.iterator(),n=i=>({next:()=>{if(i.length===0){let a=r.next();e.push(a),t.push(a)}return i.shift()}});return[new s(()=>n(e),this.controller,m(this,qt,"f")),new s(()=>n(t),this.controller,m(this,qt,"f"))]}toReadableStream(){let e=this,t;return dn({async start(){t=e[Symbol.asyncIterator]()},async pull(r){try{let{value:n,done:i}=await t.next();if(i)return r.close();let a=Ft(JSON.stringify(n)+`
`);r.enqueue(a)}catch(n){r.error(n)}},async cancel(){await t.return?.()}})}};async function*ha(s,e){if(!s.body)throw e.abort(),typeof globalThis.navigator<"u"&&globalThis.navigator.product==="ReactNative"?new _("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api"):new _("Attempted to iterate over a response with no body");let t=new hn,r=new we,n=Lt(s.body);for await(let i of ma(n))for(let a of r.decode(i)){let o=t.decode(a);o&&(yield o)}for(let i of r.flush()){let a=t.decode(i);a&&(yield a)}}async function*ma(s){let e=new Uint8Array;for await(let t of s){if(t==null)continue;let r=t instanceof ArrayBuffer?new Uint8Array(t):typeof t=="string"?Ft(t):t,n=new Uint8Array(e.length+r.length);n.set(e),n.set(r,e.length),e=n;let i;for(;(i=_s(e))!==-1;)yield e.slice(0,i),e=e.slice(i)}e.length>0&&(yield e)}var hn=class{constructor(){this.event=null,this.data=[],this.chunks=[]}decode(e){if(e.endsWith("\r")&&(e=e.substring(0,e.length-1)),!e){if(!this.event&&!this.data.length)return null;let i={event:this.event,data:this.data.join(`
`),raw:this.chunks};return this.event=null,this.data=[],this.chunks=[],i}if(this.chunks.push(e),e.startsWith(":"))return null;let[t,r,n]=ga(e,":");return n.startsWith(" ")&&(n=n.substring(1)),t==="event"?this.event=n:t==="data"&&this.data.push(n),null}};function ga(s,e){let t=s.indexOf(e);return t!==-1?[s.substring(0,t),e,s.substring(t+e.length)]:[s,"",""]}async function fr(s,e){let{response:t,requestLogID:r,retryOfRequestLogID:n,startTime:i}=e,a=await(async()=>{if(e.options.stream)return G(s).debug("response",t.status,t.url,t.headers,t.body),e.options.__streamClass?e.options.__streamClass.fromSSEResponse(t,e.controller):he.fromSSEResponse(t,e.controller);if(t.status===204)return null;if(e.options.__binaryResponse)return t;let l=t.headers.get("content-type")?.split(";")[0]?.trim();if(l?.includes("application/json")||l?.endsWith("+json")){if(t.headers.get("content-length")==="0")return;let h=await t.json();return mn(h,t)}return await t.text()})();return G(s).debug(`[${r}] response parsed`,ve({retryOfRequestLogID:n,url:t.url,status:t.status,body:a,durationMs:Date.now()-i})),a}function mn(s,e){return!s||typeof s!="object"||Array.isArray(s)?s:Object.defineProperty(s,"_request_id",{value:e.headers.get("request-id"),enumerable:!1})}var Bt,Fe=class s extends Promise{constructor(e,t,r=fr){super(n=>{n(null)}),this.responsePromise=t,this.parseResponse=r,Bt.set(this,void 0),k(this,Bt,e,"f")}_thenUnwrap(e){return new s(m(this,Bt,"f"),this.responsePromise,async(t,r)=>mn(e(await this.parseResponse(t,r),r),r.response))}asResponse(){return this.responsePromise.then(e=>e.response)}async withResponse(){let[e,t]=await Promise.all([this.parse(),this.asResponse()]);return{data:e,response:t,request_id:t.headers.get("request-id")}}parse(){return this.parsedPromise||(this.parsedPromise=this.responsePromise.then(e=>this.parseResponse(m(this,Bt,"f"),e))),this.parsedPromise}then(e,t){return this.parse().then(e,t)}catch(e){return this.parse().catch(e)}finally(e){return this.parse().finally(e)}};Bt=new WeakMap;var yr,br=class{constructor(e,t,r,n){yr.set(this,void 0),k(this,yr,e,"f"),this.options=n,this.response=t,this.body=r}hasNextPage(){return this.getPaginatedItems().length?this.nextPageRequestOptions()!=null:!1}async getNextPage(){let e=this.nextPageRequestOptions();if(!e)throw new _("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");return await m(this,yr,"f").requestAPIList(this.constructor,e)}async*iterPages(){let e=this;for(yield e;e.hasNextPage();)e=await e.getNextPage(),yield e}async*[(yr=new WeakMap,Symbol.asyncIterator)](){for await(let e of this.iterPages())for(let t of e.getPaginatedItems())yield t}},Ut=class extends Fe{constructor(e,t,r){super(e,t,async(n,i)=>new r(n,i.response,await fr(n,i),i.options))}async*[Symbol.asyncIterator](){let e=await this;for await(let t of e)yield t}},ne=class extends br{constructor(e,t,r,n){super(e,t,r,n),this.data=r.data||[],this.has_more=r.has_more||!1,this.first_id=r.first_id||null,this.last_id=r.last_id||null}getPaginatedItems(){return this.data??[]}hasNextPage(){return this.has_more===!1?!1:super.hasNextPage()}nextPageRequestOptions(){if(this.options.query?.before_id){let t=this.first_id;return t?{...this.options,query:{...pr(this.options.query),before_id:t}}:null}let e=this.last_id;return e?{...this.options,query:{...pr(this.options.query),after_id:e}}:null}};var O=class extends br{constructor(e,t,r,n){super(e,t,r,n),this.data=r.data||[],this.next_page=r.next_page||null}getPaginatedItems(){return this.data??[]}nextPageRequestOptions(){let e=this.next_page;return e?{...this.options,query:{...pr(this.options.query),page:e}}:null}};var fn=()=>{if(typeof File>"u"){let{process:s}=globalThis,e=typeof s?.versions?.node=="string"&&parseInt(s.versions.node.split("."))<20;throw new Error("`File` is not defined as a global, which is required for file uploads."+(e?" Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`.":""))}};function $e(s,e,t){return fn(),new File(s,e??"unknown_file",t)}function Wt(s,e){let t=typeof s=="object"&&s!==null&&("name"in s&&s.name&&String(s.name)||"url"in s&&s.url&&String(s.url)||"filename"in s&&s.filename&&String(s.filename)||"path"in s&&s.path&&String(s.path))||"";return e?t.split(/[\\/]/).pop()||void 0:t}var yn=s=>s!=null&&typeof s=="object"&&typeof s[Symbol.asyncIterator]=="function";var it=async(s,e,t=!0)=>({...s,body:await ba(s.body,e,t)}),Es=new WeakMap;function ya(s){let e=typeof s=="function"?s:s.fetch,t=Es.get(e);if(t)return t;let r=(async()=>{try{let n="Response"in e?e.Response:(await e("data:,")).constructor,i=new FormData;return i.toString()!==await new n(i).text()}catch{return!0}})();return Es.set(e,r),r}var ba=async(s,e,t=!0)=>{if(!await ya(e))throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");let r=new FormData;return await Promise.all(Object.entries(s||{}).map(([n,i])=>gn(r,n,i,t))),r},wa=s=>s instanceof Blob&&"name"in s;var gn=async(s,e,t,r)=>{if(t!==void 0){if(t==null)throw new TypeError(`Received null for "${e}"; to pass null in FormData, you must use the string 'null'`);if(typeof t=="string"||typeof t=="number"||typeof t=="boolean")s.append(e,String(t));else if(t instanceof Response){let n={},i=t.headers.get("Content-Type");i&&(n={type:i}),s.append(e,$e([await t.blob()],Wt(t,r),n))}else if(yn(t))s.append(e,$e([await new Response(hr(t)).blob()],Wt(t,r)));else if(wa(t))s.append(e,$e([t],Wt(t,r),{type:t.type}));else if(Array.isArray(t))await Promise.all(t.map(n=>gn(s,e+"[]",n,r)));else if(typeof t=="object")await Promise.all(Object.entries(t).map(([n,i])=>gn(s,`${e}[${n}]`,i,r)));else throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${t} instead`)}};var As=s=>s!=null&&typeof s=="object"&&typeof s.size=="number"&&typeof s.type=="string"&&typeof s.text=="function"&&typeof s.slice=="function"&&typeof s.arrayBuffer=="function",va=s=>s!=null&&typeof s=="object"&&typeof s.name=="string"&&typeof s.lastModified=="number"&&As(s),Sa=s=>s!=null&&typeof s=="object"&&typeof s.url=="string"&&typeof s.blob=="function";async function wr(s,e,t){if(fn(),s=await s,e||(e=Wt(s,!0)),va(s))return s instanceof File&&e==null&&t==null?s:$e([await s.arrayBuffer()],e??s.name,{type:s.type,lastModified:s.lastModified,...t});if(Sa(s)){let n=await s.blob();return e||(e=new URL(s.url).pathname.split(/[\\/]/).pop()),$e(await bn(n),e,t)}let r=await bn(s);if(!t?.type){let n=r.find(i=>typeof i=="object"&&"type"in i&&i.type);typeof n=="string"&&(t={...t,type:n})}return $e(r,e,t)}async function bn(s){let e=[];if(typeof s=="string"||ArrayBuffer.isView(s)||s instanceof ArrayBuffer)e.push(s);else if(As(s))e.push(s instanceof Blob?s:await s.arrayBuffer());else if(yn(s))for await(let t of s)e.push(...await bn(t));else{let t=s?.constructor?.name;throw new Error(`Unexpected data type: ${typeof s}${t?`; constructor: ${t}`:""}${xa(s)}`)}return e}function xa(s){return typeof s!="object"||s===null?"":`; props: [${Object.getOwnPropertyNames(s).map(t=>`"${t}"`).join(", ")}]`}var E=class{constructor(e){this._client=e}};var Cs=Symbol.for("brand.privateNullableHeaders");function*ka(s){if(!s)return;if(Cs in s){let{values:r,nulls:n}=s;yield*r.entries();for(let i of n)yield[i,null];return}let e=!1,t;s instanceof Headers?t=s.entries():ln(s)?t=s:(e=!0,t=Object.entries(s??{}));for(let r of t){let n=r[0];if(typeof n!="string")throw new TypeError("expected header name to be a string");let i=ln(r[1])?r[1]:[r[1]],a=!1;for(let o of i)o!==void 0&&(e&&!a&&(a=!0,yield[n,null]),yield[n,o])}}var b=s=>{let e=new Headers,t=new Set;for(let r of s){let n=new Set;for(let[i,a]of ka(r)){let o=i.toLowerCase();n.has(o)||(e.delete(i),n.add(o)),a===null?(e.delete(i),t.add(o)):(e.append(i,a),t.delete(o))}}return{[Cs]:!0,values:e,nulls:t}};function Rs(s){return s.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g,encodeURIComponent)}var Is=Object.freeze(Object.create(null)),_a=(s=Rs)=>function(t,...r){if(t.length===1)return t[0];let n=!1,i=[],a=t.reduce((d,p,h)=>{/[?#]/.test(p)&&(n=!0);let u=r[h],f=(n?encodeURIComponent:s)(""+u);return h!==r.length&&(u==null||typeof u=="object"&&u.toString===Object.getPrototypeOf(Object.getPrototypeOf(u.hasOwnProperty??Is)??Is)?.toString)&&(f=u+"",i.push({start:d.length+p.length,length:f.length,error:`Value of type ${Object.prototype.toString.call(u).slice(8,-1)} is not a valid path parameter`})),d+p+(h===r.length?"":f)},""),o=a.split(/[?#]/,1)[0],l=/(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi,c;for(;(c=l.exec(o))!==null;)i.push({start:c.index,length:c[0].length,error:`Value "${c[0]}" can't be safely passed as a path parameter`});if(i.sort((d,p)=>d.start-p.start),i.length>0){let d=0,p=i.reduce((h,u)=>{let f=" ".repeat(u.start-d),v="^".repeat(u.length);return d=u.start+u.length,h+f+v},"");throw new _(`Path parameters result in path with invalid segments:
${i.map(h=>h.error).join(`
`)}
${a}
${p}`)}return a},x=_a(Rs);var at=class extends E{create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/environments?beta=true",{body:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/environments/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/environments/${e}?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/environments?beta=true",O,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}delete(e,t={},r){let{betas:n}=t??{};return this._client.delete(x`/v1/environments/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}archive(e,t={},r){let{betas:n}=t??{};return this._client.post(x`/v1/environments/${e}/archive?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};var Gt=Symbol("anthropic.sdk.stainlessHelper");function vr(s){return typeof s=="object"&&s!==null&&Gt in s}function wn(s,e){let t=new Set;if(s)for(let r of s)vr(r)&&t.add(r[Gt]);if(e){for(let r of e)if(vr(r)&&t.add(r[Gt]),Array.isArray(r.content))for(let n of r.content)vr(n)&&t.add(n[Gt])}return Array.from(t)}function Sr(s,e){let t=wn(s,e);return t.length===0?{}:{"x-stainless-helper":t.join(", ")}}function Ms(s){return vr(s)?{"x-stainless-helper":s[Gt]}:{}}var ot=class extends E{list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/files?beta=true",ne,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"files-api-2025-04-14"].toString()},t?.headers])})}delete(e,t={},r){let{betas:n}=t??{};return this._client.delete(x`/v1/files/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"files-api-2025-04-14"].toString()},r?.headers])})}download(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/files/${e}/content?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"files-api-2025-04-14"].toString(),Accept:"application/binary"},r?.headers]),__binaryResponse:!0})}retrieveMetadata(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/files/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"files-api-2025-04-14"].toString()},r?.headers])})}upload(e,t){let{betas:r,...n}=e;return this._client.post("/v1/files?beta=true",it({body:n,...t,headers:b([{"anthropic-beta":[...r??[],"files-api-2025-04-14"].toString()},Ms(n.file),t?.headers])},this._client))}};var lt=class extends E{retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/models/${e}?beta=true`,{...r,headers:b([{...n?.toString()!=null?{"anthropic-beta":n?.toString()}:void 0},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/models?beta=true",ne,{query:n,...t,headers:b([{...r?.toString()!=null?{"anthropic-beta":r?.toString()}:void 0},t?.headers])})}};var ct=class extends E{create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/user_profiles?beta=true",{body:n,...t,headers:b([{"anthropic-beta":[...r??[],"user-profiles-2026-03-24"].toString()},t?.headers])})}retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/user_profiles/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"user-profiles-2026-03-24"].toString()},r?.headers])})}update(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/user_profiles/${e}?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"user-profiles-2026-03-24"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/user_profiles?beta=true",O,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"user-profiles-2026-03-24"].toString()},t?.headers])})}createEnrollmentURL(e,t={},r){let{betas:n}=t??{};return this._client.post(x`/v1/user_profiles/${e}/enrollment_url?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"user-profiles-2026-03-24"].toString()},r?.headers])})}};var dt=class extends E{list(e,t={},r){let{betas:n,...i}=t??{};return this._client.getAPIList(x`/v1/agents/${e}/versions?beta=true`,O,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};var qe=class extends E{constructor(){super(...arguments),this.versions=new dt(this._client)}create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/agents?beta=true",{body:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}retrieve(e,t={},r){let{betas:n,...i}=t??{};return this._client.get(x`/v1/agents/${e}?beta=true`,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/agents/${e}?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/agents?beta=true",O,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}archive(e,t={},r){let{betas:n}=t??{};return this._client.post(x`/v1/agents/${e}/archive?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};qe.Versions=dt;var pt=class extends E{create(e,t,r){let{view:n,betas:i,...a}=t;return this._client.post(x`/v1/memory_stores/${e}/memories?beta=true`,{query:{view:n},body:a,...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}retrieve(e,t,r){let{memory_store_id:n,betas:i,...a}=t;return this._client.get(x`/v1/memory_stores/${n}/memories/${e}?beta=true`,{query:a,...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{memory_store_id:n,view:i,betas:a,...o}=t;return this._client.post(x`/v1/memory_stores/${n}/memories/${e}?beta=true`,{query:{view:i},body:o,...r,headers:b([{"anthropic-beta":[...a??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e,t={},r){let{betas:n,...i}=t??{};return this._client.getAPIList(x`/v1/memory_stores/${e}/memories?beta=true`,O,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}delete(e,t,r){let{memory_store_id:n,expected_content_sha256:i,betas:a}=t;return this._client.delete(x`/v1/memory_stores/${n}/memories/${e}?beta=true`,{query:{expected_content_sha256:i},...r,headers:b([{"anthropic-beta":[...a??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};var ut=class extends E{retrieve(e,t,r){let{memory_store_id:n,betas:i,...a}=t;return this._client.get(x`/v1/memory_stores/${n}/memory_versions/${e}?beta=true`,{query:a,...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e,t={},r){let{betas:n,...i}=t??{};return this._client.getAPIList(x`/v1/memory_stores/${e}/memory_versions?beta=true`,O,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}redact(e,t,r){let{memory_store_id:n,betas:i}=t;return this._client.post(x`/v1/memory_stores/${n}/memory_versions/${e}/redact?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};var Ce=class extends E{constructor(){super(...arguments),this.memories=new pt(this._client),this.memoryVersions=new ut(this._client)}create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/memory_stores?beta=true",{body:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/memory_stores/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/memory_stores/${e}?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/memory_stores?beta=true",O,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}delete(e,t={},r){let{betas:n}=t??{};return this._client.delete(x`/v1/memory_stores/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}archive(e,t={},r){let{betas:n}=t??{};return this._client.post(x`/v1/memory_stores/${e}/archive?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};Ce.Memories=pt;Ce.MemoryVersions=ut;var ht=class s{constructor(e,t){this.iterator=e,this.controller=t}async*decoder(){let e=new we;for await(let t of this.iterator)for(let r of e.decode(t))yield JSON.parse(r);for(let t of e.flush())yield JSON.parse(t)}[Symbol.asyncIterator](){return this.decoder()}static fromResponse(e,t){if(!e.body)throw t.abort(),typeof globalThis.navigator<"u"&&globalThis.navigator.product==="ReactNative"?new _("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api"):new _("Attempted to iterate over a response with no body");return new s(Lt(e.body),t)}};var mt=class extends E{create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/messages/batches?beta=true",{body:n,...t,headers:b([{"anthropic-beta":[...r??[],"message-batches-2024-09-24"].toString()},t?.headers])})}retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/messages/batches/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"message-batches-2024-09-24"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/messages/batches?beta=true",ne,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"message-batches-2024-09-24"].toString()},t?.headers])})}delete(e,t={},r){let{betas:n}=t??{};return this._client.delete(x`/v1/messages/batches/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"message-batches-2024-09-24"].toString()},r?.headers])})}cancel(e,t={},r){let{betas:n}=t??{};return this._client.post(x`/v1/messages/batches/${e}/cancel?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"message-batches-2024-09-24"].toString()},r?.headers])})}async results(e,t={},r){let n=await this.retrieve(e);if(!n.results_url)throw new _(`No batch \`results_url\`; Has it finished processing? ${n.processing_status} - ${n.id}`);let{betas:i}=t??{};return this._client.get(n.results_url,{...r,headers:b([{"anthropic-beta":[...i??[],"message-batches-2024-09-24"].toString(),Accept:"application/binary"},r?.headers]),stream:!0,__binaryResponse:!0})._thenUnwrap((a,o)=>ht.fromResponse(o.response,o.controller))}};var xr={"claude-opus-4-20250514":8192,"claude-opus-4-0":8192,"claude-4-opus-20250514":8192,"anthropic.claude-opus-4-20250514-v1:0":8192,"claude-opus-4@20250514":8192,"claude-opus-4-1-20250805":8192,"anthropic.claude-opus-4-1-20250805-v1:0":8192,"claude-opus-4-1@20250805":8192};function Ns(s){return s?.output_format??s?.output_config?.format}function vn(s,e,t){let r=Ns(e);return!e||!("parse"in(r??{}))?{...s,content:s.content.map(n=>{if(n.type==="text"){let i=Object.defineProperty({...n},"parsed_output",{value:null,enumerable:!1});return Object.defineProperty(i,"parsed",{get(){return t.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."),null},enumerable:!1})}return n}),parsed_output:null}:Sn(s,e,t)}function Sn(s,e,t){let r=null,n=s.content.map(i=>{if(i.type==="text"){let a=La(e,i.text);r===null&&(r=a);let o=Object.defineProperty({...i},"parsed_output",{value:a,enumerable:!1});return Object.defineProperty(o,"parsed",{get(){return t.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."),a},enumerable:!1})}return i});return{...s,content:n,parsed_output:r}}function La(s,e){let t=Ns(s);if(t?.type!=="json_schema")return null;try{return"parse"in t?t.parse(e):JSON.parse(e)}catch(r){throw new _(`Failed to parse structured output: ${r}`)}}var Fa=s=>{let e=0,t=[];for(;e<s.length;){let r=s[e];if(r==="\\"){e++;continue}if(r==="{"){t.push({type:"brace",value:"{"}),e++;continue}if(r==="}"){t.push({type:"brace",value:"}"}),e++;continue}if(r==="["){t.push({type:"paren",value:"["}),e++;continue}if(r==="]"){t.push({type:"paren",value:"]"}),e++;continue}if(r===":"){t.push({type:"separator",value:":"}),e++;continue}if(r===","){t.push({type:"delimiter",value:","}),e++;continue}if(r==='"'){let o="",l=!1;for(r=s[++e];r!=='"';){if(e===s.length){l=!0;break}if(r==="\\"){if(e++,e===s.length){l=!0;break}o+=r+s[e],r=s[++e]}else o+=r,r=s[++e]}r=s[++e],l||t.push({type:"string",value:o});continue}if(r&&/\s/.test(r)){e++;continue}let i=/[0-9]/;if(r&&i.test(r)||r==="-"||r==="."){let o="";for(r==="-"&&(o+=r,r=s[++e]);r&&i.test(r)||r===".";)o+=r,r=s[++e];t.push({type:"number",value:o});continue}let a=/[a-z]/i;if(r&&a.test(r)){let o="";for(;r&&a.test(r)&&e!==s.length;)o+=r,r=s[++e];if(o=="true"||o=="false"||o==="null")t.push({type:"name",value:o});else{e++;continue}continue}e++}return t},gt=s=>{if(s.length===0)return s;let e=s[s.length-1];switch(e.type){case"separator":return s=s.slice(0,s.length-1),gt(s);break;case"number":let t=e.value[e.value.length-1];if(t==="."||t==="-")return s=s.slice(0,s.length-1),gt(s);case"string":let r=s[s.length-2];if(r?.type==="delimiter")return s=s.slice(0,s.length-1),gt(s);if(r?.type==="brace"&&r.value==="{")return s=s.slice(0,s.length-1),gt(s);break;case"delimiter":return s=s.slice(0,s.length-1),gt(s);break}return s},$a=s=>{let e=[];return s.map(t=>{t.type==="brace"&&(t.value==="{"?e.push("}"):e.splice(e.lastIndexOf("}"),1)),t.type==="paren"&&(t.value==="["?e.push("]"):e.splice(e.lastIndexOf("]"),1))}),e.length>0&&e.reverse().map(t=>{t==="}"?s.push({type:"brace",value:"}"}):t==="]"&&s.push({type:"paren",value:"]"})}),s},qa=s=>{let e="";return s.map(t=>{t.type==="string"?e+='"'+t.value+'"':e+=t.value}),e},Pr=s=>JSON.parse(qa($a(gt(Fa(s)))));var se,Ie,ft,Ht,kr,jt,zt,_r,Vt,Se,Kt,Tr,Er,Be,Ar,Cr,Qt,xn,Os,Ir,Pn,kn,_n,Ds,Ls="__json_buf";function Fs(s){return s.type==="tool_use"||s.type==="server_tool_use"||s.type==="mcp_tool_use"}var Rr=class s{constructor(e,t){se.add(this),this.messages=[],this.receivedMessages=[],Ie.set(this,void 0),ft.set(this,null),this.controller=new AbortController,Ht.set(this,void 0),kr.set(this,()=>{}),jt.set(this,()=>{}),zt.set(this,void 0),_r.set(this,()=>{}),Vt.set(this,()=>{}),Se.set(this,{}),Kt.set(this,!1),Tr.set(this,!1),Er.set(this,!1),Be.set(this,!1),Ar.set(this,void 0),Cr.set(this,void 0),Qt.set(this,void 0),Ir.set(this,r=>{if(k(this,Tr,!0,"f"),be(r)&&(r=new H),r instanceof H)return k(this,Er,!0,"f"),this._emit("abort",r);if(r instanceof _)return this._emit("error",r);if(r instanceof Error){let n=new _(r.message);return n.cause=r,this._emit("error",n)}return this._emit("error",new _(String(r)))}),k(this,Ht,new Promise((r,n)=>{k(this,kr,r,"f"),k(this,jt,n,"f")}),"f"),k(this,zt,new Promise((r,n)=>{k(this,_r,r,"f"),k(this,Vt,n,"f")}),"f"),m(this,Ht,"f").catch(()=>{}),m(this,zt,"f").catch(()=>{}),k(this,ft,e,"f"),k(this,Qt,t?.logger??console,"f")}get response(){return m(this,Ar,"f")}get request_id(){return m(this,Cr,"f")}async withResponse(){k(this,Be,!0,"f");let e=await m(this,Ht,"f");if(!e)throw new Error("Could not resolve a `Response` object");return{data:this,response:e,request_id:e.headers.get("request-id")}}static fromReadableStream(e){let t=new s(null);return t._run(()=>t._fromReadableStream(e)),t}static createMessage(e,t,r,{logger:n}={}){let i=new s(t,{logger:n});for(let a of t.messages)i._addMessageParam(a);return k(i,ft,{...t,stream:!0},"f"),i._run(()=>i._createMessage(e,{...t,stream:!0},{...r,headers:{...r?.headers,"X-Stainless-Helper-Method":"stream"}})),i}_run(e){e().then(()=>{this._emitFinal(),this._emit("end")},m(this,Ir,"f"))}_addMessageParam(e){this.messages.push(e)}_addMessage(e,t=!0){this.receivedMessages.push(e),t&&this._emit("message",e)}async _createMessage(e,t,r){let n=r?.signal,i;n&&(n.aborted&&this.controller.abort(),i=this.controller.abort.bind(this.controller),n.addEventListener("abort",i));try{m(this,se,"m",Pn).call(this);let{response:a,data:o}=await e.create({...t,stream:!0},{...r,signal:this.controller.signal}).withResponse();this._connected(a);for await(let l of o)m(this,se,"m",kn).call(this,l);if(o.controller.signal?.aborted)throw new H;m(this,se,"m",_n).call(this)}finally{n&&i&&n.removeEventListener("abort",i)}}_connected(e){this.ended||(k(this,Ar,e,"f"),k(this,Cr,e?.headers.get("request-id"),"f"),m(this,kr,"f").call(this,e),this._emit("connect"))}get ended(){return m(this,Kt,"f")}get errored(){return m(this,Tr,"f")}get aborted(){return m(this,Er,"f")}abort(){this.controller.abort()}on(e,t){return(m(this,Se,"f")[e]||(m(this,Se,"f")[e]=[])).push({listener:t}),this}off(e,t){let r=m(this,Se,"f")[e];if(!r)return this;let n=r.findIndex(i=>i.listener===t);return n>=0&&r.splice(n,1),this}once(e,t){return(m(this,Se,"f")[e]||(m(this,Se,"f")[e]=[])).push({listener:t,once:!0}),this}emitted(e){return new Promise((t,r)=>{k(this,Be,!0,"f"),e!=="error"&&this.once("error",r),this.once(e,t)})}async done(){k(this,Be,!0,"f"),await m(this,zt,"f")}get currentMessage(){return m(this,Ie,"f")}async finalMessage(){return await this.done(),m(this,se,"m",xn).call(this)}async finalText(){return await this.done(),m(this,se,"m",Os).call(this)}_emit(e,...t){if(m(this,Kt,"f"))return;e==="end"&&(k(this,Kt,!0,"f"),m(this,_r,"f").call(this));let r=m(this,Se,"f")[e];if(r&&(m(this,Se,"f")[e]=r.filter(n=>!n.once),r.forEach(({listener:n})=>n(...t))),e==="abort"){let n=t[0];!m(this,Be,"f")&&!r?.length&&Promise.reject(n),m(this,jt,"f").call(this,n),m(this,Vt,"f").call(this,n),this._emit("end");return}if(e==="error"){let n=t[0];!m(this,Be,"f")&&!r?.length&&Promise.reject(n),m(this,jt,"f").call(this,n),m(this,Vt,"f").call(this,n),this._emit("end")}}_emitFinal(){this.receivedMessages.at(-1)&&this._emit("finalMessage",m(this,se,"m",xn).call(this))}async _fromReadableStream(e,t){let r=t?.signal,n;r&&(r.aborted&&this.controller.abort(),n=this.controller.abort.bind(this.controller),r.addEventListener("abort",n));try{m(this,se,"m",Pn).call(this),this._connected(null);let i=he.fromReadableStream(e,this.controller);for await(let a of i)m(this,se,"m",kn).call(this,a);if(i.controller.signal?.aborted)throw new H;m(this,se,"m",_n).call(this)}finally{r&&n&&r.removeEventListener("abort",n)}}[(Ie=new WeakMap,ft=new WeakMap,Ht=new WeakMap,kr=new WeakMap,jt=new WeakMap,zt=new WeakMap,_r=new WeakMap,Vt=new WeakMap,Se=new WeakMap,Kt=new WeakMap,Tr=new WeakMap,Er=new WeakMap,Be=new WeakMap,Ar=new WeakMap,Cr=new WeakMap,Qt=new WeakMap,Ir=new WeakMap,se=new WeakSet,xn=function(){if(this.receivedMessages.length===0)throw new _("stream ended without producing a Message with role=assistant");return this.receivedMessages.at(-1)},Os=function(){if(this.receivedMessages.length===0)throw new _("stream ended without producing a Message with role=assistant");let t=this.receivedMessages.at(-1).content.filter(r=>r.type==="text").map(r=>r.text);if(t.length===0)throw new _("stream ended without producing a content block with type=text");return t.join(" ")},Pn=function(){this.ended||k(this,Ie,void 0,"f")},kn=function(t){if(this.ended)return;let r=m(this,se,"m",Ds).call(this,t);switch(this._emit("streamEvent",t,r),t.type){case"content_block_delta":{let n=r.content.at(-1);switch(t.delta.type){case"text_delta":{n.type==="text"&&this._emit("text",t.delta.text,n.text||"");break}case"citations_delta":{n.type==="text"&&this._emit("citation",t.delta.citation,n.citations??[]);break}case"input_json_delta":{Fs(n)&&n.input&&this._emit("inputJson",t.delta.partial_json,n.input);break}case"thinking_delta":{n.type==="thinking"&&this._emit("thinking",t.delta.thinking,n.thinking);break}case"signature_delta":{n.type==="thinking"&&this._emit("signature",n.signature);break}case"compaction_delta":{n.type==="compaction"&&n.content&&this._emit("compaction",n.content);break}default:t.delta}break}case"message_stop":{this._addMessageParam(r),this._addMessage(vn(r,m(this,ft,"f"),{logger:m(this,Qt,"f")}),!0);break}case"content_block_stop":{this._emit("contentBlock",r.content.at(-1));break}case"message_start":{k(this,Ie,r,"f");break}case"content_block_start":case"message_delta":break}},_n=function(){if(this.ended)throw new _("stream has ended, this shouldn't happen");let t=m(this,Ie,"f");if(!t)throw new _("request ended without sending any chunks");return k(this,Ie,void 0,"f"),vn(t,m(this,ft,"f"),{logger:m(this,Qt,"f")})},Ds=function(t){let r=m(this,Ie,"f");if(t.type==="message_start"){if(r)throw new _(`Unexpected event order, got ${t.type} before receiving "message_stop"`);return t.message}if(!r)throw new _(`Unexpected event order, got ${t.type} before "message_start"`);switch(t.type){case"message_stop":return r;case"message_delta":return r.container=t.delta.container,r.stop_reason=t.delta.stop_reason,r.stop_sequence=t.delta.stop_sequence,r.usage.output_tokens=t.usage.output_tokens,r.context_management=t.context_management,t.usage.input_tokens!=null&&(r.usage.input_tokens=t.usage.input_tokens),t.usage.cache_creation_input_tokens!=null&&(r.usage.cache_creation_input_tokens=t.usage.cache_creation_input_tokens),t.usage.cache_read_input_tokens!=null&&(r.usage.cache_read_input_tokens=t.usage.cache_read_input_tokens),t.usage.server_tool_use!=null&&(r.usage.server_tool_use=t.usage.server_tool_use),t.usage.iterations!=null&&(r.usage.iterations=t.usage.iterations),r;case"content_block_start":return r.content.push(t.content_block),r;case"content_block_delta":{let n=r.content.at(t.index);switch(t.delta.type){case"text_delta":{n?.type==="text"&&(r.content[t.index]={...n,text:(n.text||"")+t.delta.text});break}case"citations_delta":{n?.type==="text"&&(r.content[t.index]={...n,citations:[...n.citations??[],t.delta.citation]});break}case"input_json_delta":{if(n&&Fs(n)){let i=n[Ls]||"";i+=t.delta.partial_json;let a={...n};if(Object.defineProperty(a,Ls,{value:i,enumerable:!1,writable:!0}),i)try{a.input=Pr(i)}catch(o){let l=new _(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${o}. JSON: ${i}`);m(this,Ir,"f").call(this,l)}r.content[t.index]=a}break}case"thinking_delta":{n?.type==="thinking"&&(r.content[t.index]={...n,thinking:n.thinking+t.delta.thinking});break}case"signature_delta":{n?.type==="thinking"&&(r.content[t.index]={...n,signature:t.delta.signature});break}case"compaction_delta":{n?.type==="compaction"&&(r.content[t.index]={...n,content:(n.content||"")+t.delta.content});break}default:t.delta}return r}case"content_block_stop":return r}},Symbol.asyncIterator)](){let e=[],t=[],r=!1;return this.on("streamEvent",n=>{let i=t.shift();i?i.resolve(n):e.push(n)}),this.on("end",()=>{r=!0;for(let n of t)n.resolve(void 0);t.length=0}),this.on("abort",n=>{r=!0;for(let i of t)i.reject(n);t.length=0}),this.on("error",n=>{r=!0;for(let i of t)i.reject(n);t.length=0}),{next:async()=>e.length?{value:e.shift(),done:!1}:r?{value:void 0,done:!0}:new Promise((i,a)=>t.push({resolve:i,reject:a})).then(i=>i?{value:i,done:!1}:{value:void 0,done:!0}),return:async()=>(this.abort(),{value:void 0,done:!0})}}toReadableStream(){return new he(this[Symbol.asyncIterator].bind(this),this.controller).toReadableStream()}};var Ue=class extends Error{constructor(e){let t=typeof e=="string"?e:e.map(r=>r.type==="text"?r.text:`[${r.type}]`).join(" ");super(t),this.name="ToolError",this.content=e}};var $s=`You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete\u2014err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;var Yt,yt,We,$,J,re,xe,Re,Jt,qs,Tn;function Bs(){let s,e;return{promise:new Promise((r,n)=>{s=r,e=n}),resolve:s,reject:e}}var bt=class{constructor(e,t,r){Yt.add(this),this.client=e,yt.set(this,!1),We.set(this,!1),$.set(this,void 0),J.set(this,void 0),re.set(this,void 0),xe.set(this,void 0),Re.set(this,void 0),Jt.set(this,0),k(this,$,{params:{...t,messages:structuredClone(t.messages)}},"f");let i=["BetaToolRunner",...wn(t.tools,t.messages)].join(", ");k(this,J,{...r,headers:b([{"x-stainless-helper":i},r?.headers])},"f"),k(this,Re,Bs(),"f"),t.compactionControl?.enabled&&console.warn('Anthropic: The `compactionControl` parameter is deprecated and will be removed in a future version. Use server-side compaction instead by passing `edits: [{ type: "compact_20260112" }]` in the params passed to `toolRunner()`. See https://platform.claude.com/docs/en/build-with-claude/compaction')}async*[(yt=new WeakMap,We=new WeakMap,$=new WeakMap,J=new WeakMap,re=new WeakMap,xe=new WeakMap,Re=new WeakMap,Jt=new WeakMap,Yt=new WeakSet,qs=async function(){let t=m(this,$,"f").params.compactionControl;if(!t||!t.enabled)return!1;let r=0;if(m(this,re,"f")!==void 0)try{let c=await m(this,re,"f");r=c.usage.input_tokens+(c.usage.cache_creation_input_tokens??0)+(c.usage.cache_read_input_tokens??0)+c.usage.output_tokens}catch{return!1}let n=t.contextTokenThreshold??1e5;if(r<n)return!1;let i=t.model??m(this,$,"f").params.model,a=t.summaryPrompt??$s,o=m(this,$,"f").params.messages;if(o[o.length-1].role==="assistant"){let c=o[o.length-1];if(Array.isArray(c.content)){let d=c.content.filter(p=>p.type!=="tool_use");d.length===0?o.pop():c.content=d}}let l=await this.client.beta.messages.create({model:i,messages:[...o,{role:"user",content:[{type:"text",text:a}]}],max_tokens:m(this,$,"f").params.max_tokens},{signal:m(this,J,"f").signal,headers:b([m(this,J,"f").headers,{"x-stainless-helper":"compaction"}])});if(l.content[0]?.type!=="text")throw new _("Expected text response for compaction");return m(this,$,"f").params.messages=[{role:"user",content:l.content}],!0},Symbol.asyncIterator)](){var e;if(m(this,yt,"f"))throw new _("Cannot iterate over a consumed stream");k(this,yt,!0,"f"),k(this,We,!0,"f"),k(this,xe,void 0,"f");try{for(;;){let t;try{if(m(this,$,"f").params.max_iterations&&m(this,Jt,"f")>=m(this,$,"f").params.max_iterations)break;k(this,We,!1,"f"),k(this,xe,void 0,"f"),k(this,Jt,(e=m(this,Jt,"f"),e++,e),"f"),k(this,re,void 0,"f");let{max_iterations:r,compactionControl:n,...i}=m(this,$,"f").params;if(i.stream?(t=this.client.beta.messages.stream({...i},m(this,J,"f")),k(this,re,t.finalMessage(),"f"),m(this,re,"f").catch(()=>{}),yield t):(k(this,re,this.client.beta.messages.create({...i,stream:!1},m(this,J,"f")),"f"),yield m(this,re,"f")),!await m(this,Yt,"m",qs).call(this)){if(!m(this,We,"f")){let{role:l,content:c}=await m(this,re,"f");m(this,$,"f").params.messages.push({role:l,content:c})}let o=await m(this,Yt,"m",Tn).call(this,m(this,$,"f").params.messages.at(-1));if(o)m(this,$,"f").params.messages.push(o);else if(!m(this,We,"f"))break}}finally{t&&t.abort()}}if(!m(this,re,"f"))throw new _("ToolRunner concluded without a message from the server");m(this,Re,"f").resolve(await m(this,re,"f"))}catch(t){throw k(this,yt,!1,"f"),m(this,Re,"f").promise.catch(()=>{}),m(this,Re,"f").reject(t),k(this,Re,Bs(),"f"),t}}setMessagesParams(e){typeof e=="function"?m(this,$,"f").params=e(m(this,$,"f").params):m(this,$,"f").params=e,k(this,We,!0,"f"),k(this,xe,void 0,"f")}setRequestOptions(e){typeof e=="function"?k(this,J,e(m(this,J,"f")),"f"):k(this,J,{...m(this,J,"f"),...e},"f")}async generateToolResponse(e=m(this,J,"f").signal){let t=await m(this,re,"f")??this.params.messages.at(-1);return t?m(this,Yt,"m",Tn).call(this,t,e):null}done(){return m(this,Re,"f").promise}async runUntilDone(){if(!m(this,yt,"f"))for await(let e of this);return this.done()}get params(){return m(this,$,"f").params}pushMessages(...e){this.setMessagesParams(t=>({...t,messages:[...t.messages,...e]}))}then(e,t){return this.runUntilDone().then(e,t)}};Tn=async function(e,t=m(this,J,"f").signal){return m(this,xe,"f")!==void 0?m(this,xe,"f"):(k(this,xe,Ua(m(this,$,"f").params,e,{...m(this,J,"f"),signal:t}),"f"),m(this,xe,"f"))};async function Ua(s,e=s.messages.at(-1),t){if(!e||e.role!=="assistant"||!e.content||typeof e.content=="string")return null;let r=e.content.filter(i=>i.type==="tool_use");return r.length===0?null:{role:"user",content:await Promise.all(r.map(async i=>{let a=s.tools.find(o=>("name"in o?o.name:o.mcp_server_name)===i.name);if(!a||!("run"in a))return{type:"tool_result",tool_use_id:i.id,content:`Error: Tool '${i.name}' not found`,is_error:!0};try{let o=i.input;"parse"in a&&a.parse&&(o=a.parse(o));let l=await a.run(o,{toolUseBlock:i,signal:t?.signal});return{type:"tool_result",tool_use_id:i.id,content:l}}catch(o){return{type:"tool_result",tool_use_id:i.id,content:o instanceof Ue?o.content:`Error: ${o instanceof Error?o.message:String(o)}`,is_error:!0}}}))}}var Us={"claude-1.3":"November 6th, 2024","claude-1.3-100k":"November 6th, 2024","claude-instant-1.1":"November 6th, 2024","claude-instant-1.1-100k":"November 6th, 2024","claude-instant-1.2":"November 6th, 2024","claude-3-sonnet-20240229":"July 21st, 2025","claude-3-opus-20240229":"January 5th, 2026","claude-2.1":"July 21st, 2025","claude-2.0":"July 21st, 2025","claude-3-7-sonnet-latest":"February 19th, 2026","claude-3-7-sonnet-20250219":"February 19th, 2026"},Wa=["claude-mythos-preview","claude-opus-4-6"],Pe=class extends E{constructor(){super(...arguments),this.batches=new mt(this._client)}create(e,t){let r=Ws(e),{betas:n,...i}=r;i.model in Us&&console.warn(`The model '${i.model}' is deprecated and will reach end-of-life on ${Us[i.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`),Wa.includes(i.model)&&i.thinking&&i.thinking.type==="enabled"&&console.warn(`Using Claude with ${i.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);let a=this._client._options.timeout;if(!i.stream&&a==null){let l=xr[i.model]??void 0;a=this._client.calculateNonstreamingTimeout(i.max_tokens,l)}let o=Sr(i.tools,i.messages);return this._client.post("/v1/messages?beta=true",{body:i,timeout:a??6e5,...t,headers:b([{...n?.toString()!=null?{"anthropic-beta":n?.toString()}:void 0},o,t?.headers]),stream:r.stream??!1})}parse(e,t){return t={...t,headers:b([{"anthropic-beta":[...e.betas??[],"structured-outputs-2025-12-15"].toString()},t?.headers])},this.create(e,t).then(r=>Sn(r,e,{logger:this._client.logger??console}))}stream(e,t){return Rr.createMessage(this,e,t)}countTokens(e,t){let r=Ws(e),{betas:n,...i}=r;return this._client.post("/v1/messages/count_tokens?beta=true",{body:i,...t,headers:b([{"anthropic-beta":[...n??[],"token-counting-2024-11-01"].toString()},t?.headers])})}toolRunner(e,t){return new bt(this._client,e,t)}};function Ws(s){if(!s.output_format)return s;if(s.output_config?.format)throw new _("Both output_format and output_config.format were provided. Please use only output_config.format (output_format is deprecated).");let{output_format:e,...t}=s;return{...t,output_config:{...s.output_config,format:e}}}Pe.Batches=mt;Pe.BetaToolRunner=bt;Pe.ToolError=Ue;var wt=class extends E{list(e,t={},r){let{betas:n,...i}=t??{};return this._client.getAPIList(x`/v1/sessions/${e}/events?beta=true`,O,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}send(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/sessions/${e}/events?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}stream(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/sessions/${e}/events/stream?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers]),stream:!0})}};var vt=class extends E{retrieve(e,t,r){let{session_id:n,betas:i}=t;return this._client.get(x`/v1/sessions/${n}/resources/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{session_id:n,betas:i,...a}=t;return this._client.post(x`/v1/sessions/${n}/resources/${e}?beta=true`,{body:a,...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e,t={},r){let{betas:n,...i}=t??{};return this._client.getAPIList(x`/v1/sessions/${e}/resources?beta=true`,O,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}delete(e,t,r){let{session_id:n,betas:i}=t;return this._client.delete(x`/v1/sessions/${n}/resources/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}add(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/sessions/${e}/resources?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};var Me=class extends E{constructor(){super(...arguments),this.events=new wt(this._client),this.resources=new vt(this._client)}create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/sessions?beta=true",{body:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/sessions/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/sessions/${e}?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/sessions?beta=true",O,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}delete(e,t={},r){let{betas:n}=t??{};return this._client.delete(x`/v1/sessions/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}archive(e,t={},r){let{betas:n}=t??{};return this._client.post(x`/v1/sessions/${e}/archive?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};Me.Events=wt;Me.Resources=vt;var St=class extends E{create(e,t={},r){let{betas:n,...i}=t??{};return this._client.post(x`/v1/skills/${e}/versions?beta=true`,it({body:i,...r,headers:b([{"anthropic-beta":[...n??[],"skills-2025-10-02"].toString()},r?.headers])},this._client))}retrieve(e,t,r){let{skill_id:n,betas:i}=t;return this._client.get(x`/v1/skills/${n}/versions/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"skills-2025-10-02"].toString()},r?.headers])})}list(e,t={},r){let{betas:n,...i}=t??{};return this._client.getAPIList(x`/v1/skills/${e}/versions?beta=true`,O,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"skills-2025-10-02"].toString()},r?.headers])})}delete(e,t,r){let{skill_id:n,betas:i}=t;return this._client.delete(x`/v1/skills/${n}/versions/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"skills-2025-10-02"].toString()},r?.headers])})}};var Ge=class extends E{constructor(){super(...arguments),this.versions=new St(this._client)}create(e={},t){let{betas:r,...n}=e??{};return this._client.post("/v1/skills?beta=true",it({body:n,...t,headers:b([{"anthropic-beta":[...r??[],"skills-2025-10-02"].toString()},t?.headers])},this._client,!1))}retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/skills/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"skills-2025-10-02"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/skills?beta=true",O,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"skills-2025-10-02"].toString()},t?.headers])})}delete(e,t={},r){let{betas:n}=t??{};return this._client.delete(x`/v1/skills/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"skills-2025-10-02"].toString()},r?.headers])})}};Ge.Versions=St;var xt=class extends E{create(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/vaults/${e}/credentials?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}retrieve(e,t,r){let{vault_id:n,betas:i}=t;return this._client.get(x`/v1/vaults/${n}/credentials/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{vault_id:n,betas:i,...a}=t;return this._client.post(x`/v1/vaults/${n}/credentials/${e}?beta=true`,{body:a,...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e,t={},r){let{betas:n,...i}=t??{};return this._client.getAPIList(x`/v1/vaults/${e}/credentials?beta=true`,O,{query:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}delete(e,t,r){let{vault_id:n,betas:i}=t;return this._client.delete(x`/v1/vaults/${n}/credentials/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}archive(e,t,r){let{vault_id:n,betas:i}=t;return this._client.post(x`/v1/vaults/${n}/credentials/${e}/archive?beta=true`,{...r,headers:b([{"anthropic-beta":[...i??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};var He=class extends E{constructor(){super(...arguments),this.credentials=new xt(this._client)}create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/vaults?beta=true",{body:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/vaults/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}update(e,t,r){let{betas:n,...i}=t;return this._client.post(x`/v1/vaults/${e}?beta=true`,{body:i,...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/vaults?beta=true",O,{query:n,...t,headers:b([{"anthropic-beta":[...r??[],"managed-agents-2026-04-01"].toString()},t?.headers])})}delete(e,t={},r){let{betas:n}=t??{};return this._client.delete(x`/v1/vaults/${e}?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}archive(e,t={},r){let{betas:n}=t??{};return this._client.post(x`/v1/vaults/${e}/archive?beta=true`,{...r,headers:b([{"anthropic-beta":[...n??[],"managed-agents-2026-04-01"].toString()},r?.headers])})}};He.Credentials=xt;var j=class extends E{constructor(){super(...arguments),this.models=new lt(this._client),this.messages=new Pe(this._client),this.agents=new qe(this._client),this.environments=new at(this._client),this.sessions=new Me(this._client),this.vaults=new He(this._client),this.memoryStores=new Ce(this._client),this.files=new ot(this._client),this.skills=new Ge(this._client),this.userProfiles=new ct(this._client)}};j.Models=lt;j.Messages=Pe;j.Agents=qe;j.Environments=at;j.Sessions=Me;j.Vaults=He;j.MemoryStores=Ce;j.Files=ot;j.Skills=Ge;j.UserProfiles=ct;var je=class extends E{create(e,t){let{betas:r,...n}=e;return this._client.post("/v1/complete",{body:n,timeout:this._client._options.timeout??6e5,...t,headers:b([{...r?.toString()!=null?{"anthropic-beta":r?.toString()}:void 0},t?.headers]),stream:e.stream??!1})}};function Gs(s){return s?.output_config?.format}function En(s,e,t){let r=Gs(e);return!e||!("parse"in(r??{}))?{...s,content:s.content.map(n=>n.type==="text"?Object.defineProperty({...n},"parsed_output",{value:null,enumerable:!1}):n),parsed_output:null}:An(s,e,t)}function An(s,e,t){let r=null,n=s.content.map(i=>{if(i.type==="text"){let a=Ja(e,i.text);return r===null&&(r=a),Object.defineProperty({...i},"parsed_output",{value:a,enumerable:!1})}return i});return{...s,content:n,parsed_output:r}}function Ja(s,e){let t=Gs(s);if(t?.type!=="json_schema")return null;try{return"parse"in t?t.parse(e):JSON.parse(e)}catch(r){throw new _(`Failed to parse structured output: ${r}`)}}var ie,Ne,Pt,Xt,Mr,Zt,er,Nr,tr,ke,rr,Or,Dr,ze,Lr,Fr,nr,Cn,Hs,In,Rn,Mn,Nn,js,zs="__json_buf";function Vs(s){return s.type==="tool_use"||s.type==="server_tool_use"}var $r=class s{constructor(e,t){ie.add(this),this.messages=[],this.receivedMessages=[],Ne.set(this,void 0),Pt.set(this,null),this.controller=new AbortController,Xt.set(this,void 0),Mr.set(this,()=>{}),Zt.set(this,()=>{}),er.set(this,void 0),Nr.set(this,()=>{}),tr.set(this,()=>{}),ke.set(this,{}),rr.set(this,!1),Or.set(this,!1),Dr.set(this,!1),ze.set(this,!1),Lr.set(this,void 0),Fr.set(this,void 0),nr.set(this,void 0),In.set(this,r=>{if(k(this,Or,!0,"f"),be(r)&&(r=new H),r instanceof H)return k(this,Dr,!0,"f"),this._emit("abort",r);if(r instanceof _)return this._emit("error",r);if(r instanceof Error){let n=new _(r.message);return n.cause=r,this._emit("error",n)}return this._emit("error",new _(String(r)))}),k(this,Xt,new Promise((r,n)=>{k(this,Mr,r,"f"),k(this,Zt,n,"f")}),"f"),k(this,er,new Promise((r,n)=>{k(this,Nr,r,"f"),k(this,tr,n,"f")}),"f"),m(this,Xt,"f").catch(()=>{}),m(this,er,"f").catch(()=>{}),k(this,Pt,e,"f"),k(this,nr,t?.logger??console,"f")}get response(){return m(this,Lr,"f")}get request_id(){return m(this,Fr,"f")}async withResponse(){k(this,ze,!0,"f");let e=await m(this,Xt,"f");if(!e)throw new Error("Could not resolve a `Response` object");return{data:this,response:e,request_id:e.headers.get("request-id")}}static fromReadableStream(e){let t=new s(null);return t._run(()=>t._fromReadableStream(e)),t}static createMessage(e,t,r,{logger:n}={}){let i=new s(t,{logger:n});for(let a of t.messages)i._addMessageParam(a);return k(i,Pt,{...t,stream:!0},"f"),i._run(()=>i._createMessage(e,{...t,stream:!0},{...r,headers:{...r?.headers,"X-Stainless-Helper-Method":"stream"}})),i}_run(e){e().then(()=>{this._emitFinal(),this._emit("end")},m(this,In,"f"))}_addMessageParam(e){this.messages.push(e)}_addMessage(e,t=!0){this.receivedMessages.push(e),t&&this._emit("message",e)}async _createMessage(e,t,r){let n=r?.signal,i;n&&(n.aborted&&this.controller.abort(),i=this.controller.abort.bind(this.controller),n.addEventListener("abort",i));try{m(this,ie,"m",Rn).call(this);let{response:a,data:o}=await e.create({...t,stream:!0},{...r,signal:this.controller.signal}).withResponse();this._connected(a);for await(let l of o)m(this,ie,"m",Mn).call(this,l);if(o.controller.signal?.aborted)throw new H;m(this,ie,"m",Nn).call(this)}finally{n&&i&&n.removeEventListener("abort",i)}}_connected(e){this.ended||(k(this,Lr,e,"f"),k(this,Fr,e?.headers.get("request-id"),"f"),m(this,Mr,"f").call(this,e),this._emit("connect"))}get ended(){return m(this,rr,"f")}get errored(){return m(this,Or,"f")}get aborted(){return m(this,Dr,"f")}abort(){this.controller.abort()}on(e,t){return(m(this,ke,"f")[e]||(m(this,ke,"f")[e]=[])).push({listener:t}),this}off(e,t){let r=m(this,ke,"f")[e];if(!r)return this;let n=r.findIndex(i=>i.listener===t);return n>=0&&r.splice(n,1),this}once(e,t){return(m(this,ke,"f")[e]||(m(this,ke,"f")[e]=[])).push({listener:t,once:!0}),this}emitted(e){return new Promise((t,r)=>{k(this,ze,!0,"f"),e!=="error"&&this.once("error",r),this.once(e,t)})}async done(){k(this,ze,!0,"f"),await m(this,er,"f")}get currentMessage(){return m(this,Ne,"f")}async finalMessage(){return await this.done(),m(this,ie,"m",Cn).call(this)}async finalText(){return await this.done(),m(this,ie,"m",Hs).call(this)}_emit(e,...t){if(m(this,rr,"f"))return;e==="end"&&(k(this,rr,!0,"f"),m(this,Nr,"f").call(this));let r=m(this,ke,"f")[e];if(r&&(m(this,ke,"f")[e]=r.filter(n=>!n.once),r.forEach(({listener:n})=>n(...t))),e==="abort"){let n=t[0];!m(this,ze,"f")&&!r?.length&&Promise.reject(n),m(this,Zt,"f").call(this,n),m(this,tr,"f").call(this,n),this._emit("end");return}if(e==="error"){let n=t[0];!m(this,ze,"f")&&!r?.length&&Promise.reject(n),m(this,Zt,"f").call(this,n),m(this,tr,"f").call(this,n),this._emit("end")}}_emitFinal(){this.receivedMessages.at(-1)&&this._emit("finalMessage",m(this,ie,"m",Cn).call(this))}async _fromReadableStream(e,t){let r=t?.signal,n;r&&(r.aborted&&this.controller.abort(),n=this.controller.abort.bind(this.controller),r.addEventListener("abort",n));try{m(this,ie,"m",Rn).call(this),this._connected(null);let i=he.fromReadableStream(e,this.controller);for await(let a of i)m(this,ie,"m",Mn).call(this,a);if(i.controller.signal?.aborted)throw new H;m(this,ie,"m",Nn).call(this)}finally{r&&n&&r.removeEventListener("abort",n)}}[(Ne=new WeakMap,Pt=new WeakMap,Xt=new WeakMap,Mr=new WeakMap,Zt=new WeakMap,er=new WeakMap,Nr=new WeakMap,tr=new WeakMap,ke=new WeakMap,rr=new WeakMap,Or=new WeakMap,Dr=new WeakMap,ze=new WeakMap,Lr=new WeakMap,Fr=new WeakMap,nr=new WeakMap,In=new WeakMap,ie=new WeakSet,Cn=function(){if(this.receivedMessages.length===0)throw new _("stream ended without producing a Message with role=assistant");return this.receivedMessages.at(-1)},Hs=function(){if(this.receivedMessages.length===0)throw new _("stream ended without producing a Message with role=assistant");let t=this.receivedMessages.at(-1).content.filter(r=>r.type==="text").map(r=>r.text);if(t.length===0)throw new _("stream ended without producing a content block with type=text");return t.join(" ")},Rn=function(){this.ended||k(this,Ne,void 0,"f")},Mn=function(t){if(this.ended)return;let r=m(this,ie,"m",js).call(this,t);switch(this._emit("streamEvent",t,r),t.type){case"content_block_delta":{let n=r.content.at(-1);switch(t.delta.type){case"text_delta":{n.type==="text"&&this._emit("text",t.delta.text,n.text||"");break}case"citations_delta":{n.type==="text"&&this._emit("citation",t.delta.citation,n.citations??[]);break}case"input_json_delta":{Vs(n)&&n.input&&this._emit("inputJson",t.delta.partial_json,n.input);break}case"thinking_delta":{n.type==="thinking"&&this._emit("thinking",t.delta.thinking,n.thinking);break}case"signature_delta":{n.type==="thinking"&&this._emit("signature",n.signature);break}default:t.delta}break}case"message_stop":{this._addMessageParam(r),this._addMessage(En(r,m(this,Pt,"f"),{logger:m(this,nr,"f")}),!0);break}case"content_block_stop":{this._emit("contentBlock",r.content.at(-1));break}case"message_start":{k(this,Ne,r,"f");break}case"content_block_start":case"message_delta":break}},Nn=function(){if(this.ended)throw new _("stream has ended, this shouldn't happen");let t=m(this,Ne,"f");if(!t)throw new _("request ended without sending any chunks");return k(this,Ne,void 0,"f"),En(t,m(this,Pt,"f"),{logger:m(this,nr,"f")})},js=function(t){let r=m(this,Ne,"f");if(t.type==="message_start"){if(r)throw new _(`Unexpected event order, got ${t.type} before receiving "message_stop"`);return t.message}if(!r)throw new _(`Unexpected event order, got ${t.type} before "message_start"`);switch(t.type){case"message_stop":return r;case"message_delta":return r.stop_reason=t.delta.stop_reason,r.stop_sequence=t.delta.stop_sequence,r.usage.output_tokens=t.usage.output_tokens,t.usage.input_tokens!=null&&(r.usage.input_tokens=t.usage.input_tokens),t.usage.cache_creation_input_tokens!=null&&(r.usage.cache_creation_input_tokens=t.usage.cache_creation_input_tokens),t.usage.cache_read_input_tokens!=null&&(r.usage.cache_read_input_tokens=t.usage.cache_read_input_tokens),t.usage.server_tool_use!=null&&(r.usage.server_tool_use=t.usage.server_tool_use),r;case"content_block_start":return r.content.push({...t.content_block}),r;case"content_block_delta":{let n=r.content.at(t.index);switch(t.delta.type){case"text_delta":{n?.type==="text"&&(r.content[t.index]={...n,text:(n.text||"")+t.delta.text});break}case"citations_delta":{n?.type==="text"&&(r.content[t.index]={...n,citations:[...n.citations??[],t.delta.citation]});break}case"input_json_delta":{if(n&&Vs(n)){let i=n[zs]||"";i+=t.delta.partial_json;let a={...n};Object.defineProperty(a,zs,{value:i,enumerable:!1,writable:!0}),i&&(a.input=Pr(i)),r.content[t.index]=a}break}case"thinking_delta":{n?.type==="thinking"&&(r.content[t.index]={...n,thinking:n.thinking+t.delta.thinking});break}case"signature_delta":{n?.type==="thinking"&&(r.content[t.index]={...n,signature:t.delta.signature});break}default:t.delta}return r}case"content_block_stop":return r}},Symbol.asyncIterator)](){let e=[],t=[],r=!1;return this.on("streamEvent",n=>{let i=t.shift();i?i.resolve(n):e.push(n)}),this.on("end",()=>{r=!0;for(let n of t)n.resolve(void 0);t.length=0}),this.on("abort",n=>{r=!0;for(let i of t)i.reject(n);t.length=0}),this.on("error",n=>{r=!0;for(let i of t)i.reject(n);t.length=0}),{next:async()=>e.length?{value:e.shift(),done:!1}:r?{value:void 0,done:!0}:new Promise((i,a)=>t.push({resolve:i,reject:a})).then(i=>i?{value:i,done:!1}:{value:void 0,done:!0}),return:async()=>(this.abort(),{value:void 0,done:!0})}}toReadableStream(){return new he(this[Symbol.asyncIterator].bind(this),this.controller).toReadableStream()}};var kt=class extends E{create(e,t){return this._client.post("/v1/messages/batches",{body:e,...t})}retrieve(e,t){return this._client.get(x`/v1/messages/batches/${e}`,t)}list(e={},t){return this._client.getAPIList("/v1/messages/batches",ne,{query:e,...t})}delete(e,t){return this._client.delete(x`/v1/messages/batches/${e}`,t)}cancel(e,t){return this._client.post(x`/v1/messages/batches/${e}/cancel`,t)}async results(e,t){let r=await this.retrieve(e);if(!r.results_url)throw new _(`No batch \`results_url\`; Has it finished processing? ${r.processing_status} - ${r.id}`);return this._client.get(r.results_url,{...t,headers:b([{Accept:"application/binary"},t?.headers]),stream:!0,__binaryResponse:!0})._thenUnwrap((n,i)=>ht.fromResponse(i.response,i.controller))}};var Oe=class extends E{constructor(){super(...arguments),this.batches=new kt(this._client)}create(e,t){e.model in Ks&&console.warn(`The model '${e.model}' is deprecated and will reach end-of-life on ${Ks[e.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`),Za.includes(e.model)&&e.thinking&&e.thinking.type==="enabled"&&console.warn(`Using Claude with ${e.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);let r=this._client._options.timeout;if(!e.stream&&r==null){let i=xr[e.model]??void 0;r=this._client.calculateNonstreamingTimeout(e.max_tokens,i)}let n=Sr(e.tools,e.messages);return this._client.post("/v1/messages",{body:e,timeout:r??6e5,...t,headers:b([n,t?.headers]),stream:e.stream??!1})}parse(e,t){return this.create(e,t).then(r=>An(r,e,{logger:this._client.logger??console}))}stream(e,t){return $r.createMessage(this,e,t,{logger:this._client.logger??console})}countTokens(e,t){return this._client.post("/v1/messages/count_tokens",{body:e,...t})}},Ks={"claude-1.3":"November 6th, 2024","claude-1.3-100k":"November 6th, 2024","claude-instant-1.1":"November 6th, 2024","claude-instant-1.1-100k":"November 6th, 2024","claude-instant-1.2":"November 6th, 2024","claude-3-sonnet-20240229":"July 21st, 2025","claude-3-opus-20240229":"January 5th, 2026","claude-2.1":"July 21st, 2025","claude-2.0":"July 21st, 2025","claude-3-7-sonnet-latest":"February 19th, 2026","claude-3-7-sonnet-20250219":"February 19th, 2026","claude-3-5-haiku-latest":"February 19th, 2026","claude-3-5-haiku-20241022":"February 19th, 2026","claude-opus-4-0":"June 15th, 2026","claude-opus-4-20250514":"June 15th, 2026","claude-sonnet-4-0":"June 15th, 2026","claude-sonnet-4-20250514":"June 15th, 2026"},Za=["claude-mythos-preview","claude-opus-4-6"];Oe.Batches=kt;var Ve=class extends E{retrieve(e,t={},r){let{betas:n}=t??{};return this._client.get(x`/v1/models/${e}`,{...r,headers:b([{...n?.toString()!=null?{"anthropic-beta":n?.toString()}:void 0},r?.headers])})}list(e={},t){let{betas:r,...n}=e??{};return this._client.getAPIList("/v1/models",ne,{query:n,...t,headers:b([{...r?.toString()!=null?{"anthropic-beta":r?.toString()}:void 0},t?.headers])})}};var _t=s=>{if(typeof globalThis.process<"u")return globalThis.process.env?.[s]?.trim()||void 0;if(typeof globalThis.Deno<"u")return globalThis.Deno.env?.get?.(s)?.trim()||void 0};var On,Dn,qr,Qs,Ys="\\n\\nHuman:",Js="\\n\\nAssistant:",L=class{constructor({baseURL:e=_t("ANTHROPIC_BASE_URL"),apiKey:t=_t("ANTHROPIC_API_KEY")??null,authToken:r=_t("ANTHROPIC_AUTH_TOKEN")??null,...n}={}){On.add(this),qr.set(this,void 0);let i={apiKey:t,authToken:r,...n,baseURL:e||"https://api.anthropic.com"};if(!i.dangerouslyAllowBrowser&&fs())throw new _(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);this.baseURL=i.baseURL,this.timeout=i.timeout??Dn.DEFAULT_TIMEOUT,this.logger=i.logger??console;let a="warn";this.logLevel=a,this.logLevel=un(i.logLevel,"ClientOptions.logLevel",this)??un(_t("ANTHROPIC_LOG"),"process.env['ANTHROPIC_LOG']",this)??a,this.fetchOptions=i.fetchOptions,this.maxRetries=i.maxRetries??2,this.fetch=i.fetch??bs(),k(this,qr,vs,"f");let o=_t("ANTHROPIC_CUSTOM_HEADERS");if(o){let l={};for(let c of o.split(`
`)){let d=c.indexOf(":");d>=0&&(l[c.substring(0,d).trim()]=c.substring(d+1).trim())}i.defaultHeaders={...l,...i.defaultHeaders}}this._options=i,this.apiKey=typeof t=="string"?t:null,this.authToken=r}withOptions(e){return new this.constructor({...this._options,baseURL:this.baseURL,maxRetries:this.maxRetries,timeout:this.timeout,logger:this.logger,logLevel:this.logLevel,fetch:this.fetch,fetchOptions:this.fetchOptions,apiKey:this.apiKey,authToken:this.authToken,...e})}defaultQuery(){return this._options.defaultQuery}validateHeaders({values:e,nulls:t}){if(!(e.get("x-api-key")||e.get("authorization"))&&!(this.apiKey&&e.get("x-api-key"))&&!t.has("x-api-key")&&!(this.authToken&&e.get("authorization"))&&!t.has("authorization"))throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted')}async authHeaders(e){return b([await this.apiKeyAuth(e),await this.bearerAuth(e)])}async apiKeyAuth(e){if(this.apiKey!=null)return b([{"X-Api-Key":this.apiKey}])}async bearerAuth(e){if(this.authToken!=null)return b([{Authorization:`Bearer ${this.authToken}`}])}stringifyQuery(e){return Ss(e)}getUserAgent(){return`${this.constructor.name}/JS ${Ae}`}defaultIdempotencyKey(){return`stainless-node-retry-${an()}`}makeStatusError(e,t,r,n){return W.generate(e,t,r,n)}buildURL(e,t,r){let n=!m(this,On,"m",Qs).call(this)&&r||this.baseURL,i=cs(e)?new URL(e):new URL(n+(n.endsWith("/")&&e.startsWith("/")?e.slice(1):e)),a=this.defaultQuery(),o=Object.fromEntries(i.searchParams);return(!cn(a)||!cn(o))&&(t={...o,...a,...t}),typeof t=="object"&&t&&!Array.isArray(t)&&(i.search=this.stringifyQuery(t)),i.toString()}_calculateNonstreamingTimeout(e){if(3600*e/128e3>600)throw new _("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");return 600*1e3}async prepareOptions(e){}async prepareRequest(e,{url:t,options:r}){}get(e,t){return this.methodRequest("get",e,t)}post(e,t){return this.methodRequest("post",e,t)}patch(e,t){return this.methodRequest("patch",e,t)}put(e,t){return this.methodRequest("put",e,t)}delete(e,t){return this.methodRequest("delete",e,t)}methodRequest(e,t,r){return this.request(Promise.resolve(r).then(n=>({method:e,path:t,...n})))}request(e,t=null){return new Fe(this,this.makeRequest(e,t,void 0))}async makeRequest(e,t,r){let n=await e,i=n.maxRetries??this.maxRetries;t==null&&(t=i),await this.prepareOptions(n);let{req:a,url:o,timeout:l}=await this.buildRequest(n,{retryCount:i-t});await this.prepareRequest(a,{url:o,options:n});let c="log_"+(Math.random()*(1<<24)|0).toString(16).padStart(6,"0"),d=r===void 0?"":`, retryOf: ${r}`,p=Date.now();if(G(this).debug(`[${c}] sending request`,ve({retryOfRequestLogID:r,method:n.method,url:o,options:n,headers:a.headers})),n.signal?.aborted)throw new H;let h=new AbortController,u=await this.fetchWithTimeout(o,a,l,h).catch(Dt),f=Date.now();if(u instanceof globalThis.Error){let T=`retrying, ${t} attempts remaining`;if(n.signal?.aborted)throw new H;let I=be(u)||/timed? ?out/i.test(String(u)+("cause"in u?String(u.cause):""));if(t)return G(this).info(`[${c}] connection ${I?"timed out":"failed"} - ${T}`),G(this).debug(`[${c}] connection ${I?"timed out":"failed"} (${T})`,ve({retryOfRequestLogID:r,url:o,durationMs:f-p,message:u.message})),this.retryRequest(n,t,r??c);throw G(this).info(`[${c}] connection ${I?"timed out":"failed"} - error; no more retries left`),G(this).debug(`[${c}] connection ${I?"timed out":"failed"} (error; no more retries left)`,ve({retryOfRequestLogID:r,url:o,durationMs:f-p,message:u.message})),I?new Ye:new Ee({cause:u})}let v=[...u.headers.entries()].filter(([T])=>T==="request-id").map(([T,I])=>", "+T+": "+JSON.stringify(I)).join(""),S=`[${c}${d}${v}] ${a.method} ${o} ${u.ok?"succeeded":"failed"} with status ${u.status} in ${f-p}ms`;if(!u.ok){let T=await this.shouldRetry(u);if(t&&T){let C=`retrying, ${t} attempts remaining`;return await ws(u.body),G(this).info(`${S} - ${C}`),G(this).debug(`[${c}] response error (${C})`,ve({retryOfRequestLogID:r,url:u.url,status:u.status,headers:u.headers,durationMs:f-p})),this.retryRequest(n,t,r??c,u.headers)}let I=T?"error; no more retries left":"error; not retryable";G(this).info(`${S} - ${I}`);let w=await u.text().catch(C=>Dt(C).message),y=ur(w),P=y?void 0:w;throw G(this).debug(`[${c}] response error (${I})`,ve({retryOfRequestLogID:r,url:u.url,status:u.status,headers:u.headers,message:P,durationMs:Date.now()-p})),this.makeStatusError(u.status,y,P,u.headers)}return G(this).info(S),G(this).debug(`[${c}] response start`,ve({retryOfRequestLogID:r,url:u.url,status:u.status,headers:u.headers,durationMs:f-p})),{response:u,options:n,controller:h,requestLogID:c,retryOfRequestLogID:r,startTime:p}}getAPIList(e,t,r){return this.requestAPIList(t,r&&"then"in r?r.then(n=>({method:"get",path:e,...n})):{method:"get",path:e,...r})}requestAPIList(e,t){let r=this.makeRequest(t,null,void 0);return new Ut(this,r,e)}async fetchWithTimeout(e,t,r,n){let{signal:i,method:a,...o}=t||{},l=this._makeAbort(n);i&&i.addEventListener("abort",l,{once:!0});let c=setTimeout(l,r),d=globalThis.ReadableStream&&o.body instanceof globalThis.ReadableStream||typeof o.body=="object"&&o.body!==null&&Symbol.asyncIterator in o.body,p={signal:n.signal,...d?{duplex:"half"}:{},method:"GET",...o};a&&(p.method=a.toUpperCase());try{return await this.fetch.call(void 0,e,p)}finally{clearTimeout(c)}}async shouldRetry(e){let t=e.headers.get("x-should-retry");return t==="true"?!0:t==="false"?!1:e.status===408||e.status===409||e.status===429||e.status>=500}async retryRequest(e,t,r,n){let i,a=n?.get("retry-after-ms");if(a){let l=parseFloat(a);Number.isNaN(l)||(i=l)}let o=n?.get("retry-after");if(o&&!i){let l=parseFloat(o);Number.isNaN(l)?i=Date.parse(o)-Date.now():i=l*1e3}if(i===void 0){let l=e.maxRetries??this.maxRetries;i=this.calculateDefaultRetryTimeoutMillis(t,l)}return await us(i),this.makeRequest(e,t-1,r)}calculateDefaultRetryTimeoutMillis(e,t){let i=t-e,a=Math.min(.5*Math.pow(2,i),8),o=1-Math.random()*.25;return a*o*1e3}calculateNonstreamingTimeout(e,t){if(36e5*e/128e3>6e5||t!=null&&e>t)throw new _("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");return 6e5}async buildRequest(e,{retryCount:t=0}={}){let r={...e},{method:n,path:i,query:a,defaultBaseURL:o}=r,l=this.buildURL(i,a,o);"timeout"in r&&ps("timeout",r.timeout),r.timeout=r.timeout??this.timeout;let{bodyHeaders:c,body:d}=this.buildBody({options:r}),p=await this.buildHeaders({options:e,method:n,bodyHeaders:c,retryCount:t});return{req:{method:n,headers:p,...r.signal&&{signal:r.signal},...globalThis.ReadableStream&&d instanceof globalThis.ReadableStream&&{duplex:"half"},...d&&{body:d},...this.fetchOptions??{},...r.fetchOptions??{}},url:l,timeout:r.timeout}}async buildHeaders({options:e,method:t,bodyHeaders:r,retryCount:n}){let i={};this.idempotencyHeader&&t!=="get"&&(e.idempotencyKey||(e.idempotencyKey=this.defaultIdempotencyKey()),i[this.idempotencyHeader]=e.idempotencyKey);let a=b([i,{Accept:"application/json","User-Agent":this.getUserAgent(),"X-Stainless-Retry-Count":String(n),...e.timeout?{"X-Stainless-Timeout":String(Math.trunc(e.timeout/1e3))}:{},...ys(),...this._options.dangerouslyAllowBrowser?{"anthropic-dangerous-direct-browser-access":"true"}:void 0,"anthropic-version":"2023-06-01"},await this.authHeaders(e),this._options.defaultHeaders,r,e.headers]);return this.validateHeaders(a),a.values}_makeAbort(e){return()=>e.abort()}buildBody({options:{body:e,headers:t}}){if(!e)return{bodyHeaders:void 0,body:void 0};let r=b([t]);return ArrayBuffer.isView(e)||e instanceof ArrayBuffer||e instanceof DataView||typeof e=="string"&&r.values.has("content-type")||globalThis.Blob&&e instanceof globalThis.Blob||e instanceof FormData||e instanceof URLSearchParams||globalThis.ReadableStream&&e instanceof globalThis.ReadableStream?{bodyHeaders:void 0,body:e}:typeof e=="object"&&(Symbol.asyncIterator in e||Symbol.iterator in e&&"next"in e&&typeof e.next=="function")?{bodyHeaders:void 0,body:hr(e)}:typeof e=="object"&&r.values.get("content-type")==="application/x-www-form-urlencoded"?{bodyHeaders:{"content-type":"application/x-www-form-urlencoded"},body:this.stringifyQuery(e)}:m(this,qr,"f").call(this,{body:e,headers:r})}};Dn=L,qr=new WeakMap,On=new WeakSet,Qs=function(){return this.baseURL!=="https://api.anthropic.com"};L.Anthropic=Dn;L.HUMAN_PROMPT=Ys;L.AI_PROMPT=Js;L.DEFAULT_TIMEOUT=6e5;L.AnthropicError=_;L.APIError=W;L.APIConnectionError=Ee;L.APIConnectionTimeoutError=Ye;L.APIUserAbortError=H;L.NotFoundError=et;L.ConflictError=tt;L.RateLimitError=nt;L.BadRequestError=Je;L.AuthenticationError=Xe;L.InternalServerError=st;L.PermissionDeniedError=Ze;L.UnprocessableEntityError=rt;L.toFile=wr;var K=class extends L{constructor(){super(...arguments),this.completions=new je(this),this.messages=new Oe(this),this.models=new Ve(this),this.beta=new j(this)}};K.Completions=je;K.Messages=Oe;K.Models=Ve;K.Beta=j;var Ln=require("obsidian"),to=32e3,sr=class{settings;client;constructor(e){this.settings=e,this.client=e.anthropicApiKey?new K({apiKey:e.anthropicApiKey,dangerouslyAllowBrowser:!0}):null}updateApiKey(e){this.settings.anthropicApiKey=e,this.client=e?new K({apiKey:e,dangerouslyAllowBrowser:!0}):null}async queryClaude(e,t,r,n,i){if(!this.client){new Ln.Notice("Claude API key not configured. Set ANTHROPIC_API_KEY in .env or in plugin settings.");return}let a=new Date().toISOString(),o=n.getCursor(),l=e.split(`
`).map(u=>`> ${u}`).join(`
`),c=`

***
> [!info] **Claude Query** (${a})
> **Question:**
${l}
> 
> **Model:** ${t}
> 
>`,d;if(this.settings.headerPosition==="bottom")d={...o};else{n.replaceRange(c,o,o);let u=c.split(`
`),f=u[u.length-1]??"";d={line:o.line+u.length-1,ch:f.length}}let p=[];i?.enableWebSearch!==!1&&p.push({type:"web_search_20250305",name:"web_search"});let h={model:t,max_tokens:i?.maxTokens??to,messages:[{role:"user",content:e}],tools:p};i?.enableThinking&&(h.thinking={type:"adaptive"}),i?.effort&&(h.output_config={effort:i.effort});try{r?await this.handleStreamingResponse(h,n,d,c):await this.handleNonStreamingResponse(h,n,d,c)}catch(u){this.handleError(u,n)}}async handleStreamingResponse(e,t,r,n){if(!this.client)throw new Error("Claude client not initialized");let i=this.client.messages.stream(e),a={...r};i.on("text",l=>{if(!l)return;t.replaceRange(l,a);let c=l.split(`
`);if(c.length===1)a.ch+=l.length;else{a.line+=c.length-1;let d=c[c.length-1]??"";a.ch=d.length}t.scrollIntoView({from:a,to:a},!0)});let o=await i.finalMessage();this.afterMessage(o,t,n)}async handleNonStreamingResponse(e,t,r,n){if(!this.client)throw new Error("Claude client not initialized");let a=await this.client.messages.stream(e).finalMessage(),o=a.content.filter(l=>l.type==="text").map(l=>l.text).join("");o&&t.replaceRange(o,r),this.afterMessage(a,t,n)}afterMessage(e,t,r){let n=this.extractWebCitations(e);if(n.length>0&&this.addCitations(t,n),this.settings.headerPosition==="bottom"&&r){let o=t.lastLine(),l={line:o,ch:t.getLine(o).length};t.replaceRange(`

`+r,l)}let i=t.lastLine(),a={line:i,ch:t.getLine(i).length};t.replaceRange(`

***
`,a)}extractWebCitations(e){let t=new Map;for(let a of e.content){if(a.type!=="web_search_tool_result")continue;let o=a.content;if(Array.isArray(o))for(let l of o)l.type==="web_search_result"&&(t.has(l.url)||t.set(l.url,{url:l.url,title:l.title||"Source",citedText:""}))}for(let a of e.content){if(a.type!=="text")continue;let o=a.citations;if(o)for(let l of o)l.type==="web_search_result_location"&&t.set(l.url,{url:l.url,title:l.title??"Source",citedText:l.cited_text??""})}let r=Array.from(t.values()),n=e.content.map(a=>a.type),i=e.content.filter(a=>a.type==="text").filter(a=>a.citations&&a.citations.length>0).length;return console.debug(`[ClaudeService] extractWebCitations \u2014 block types: ${JSON.stringify(n)}; text blocks with citations: ${i}; extracted: ${r.length}`),r}addCitations(e,t){if(t.length===0)return;let r=e.getValue(),n=r.match(/### Citations\n\n([\s\S]*?)(?=\n\n\*\*\*|\n\n### |\n\n## |\n\n# |$)/),i="",a=1;if(n&&n[1]){i=n[1];let l=i.match(/\[(\d+)\]:/g);l&&l.length>0&&(a=Math.max(...l.map(d=>{let p=d.match(/\d+/);return p?parseInt(p[0]):0}))+1)}let o="";if(t.forEach((l,c)=>{let d=l.citedText.replace(/\s*\n\s*/g," ").trim(),p=d?` > ${d}`:"",h=l.title.replace(/\]/g,"\\]");o+=`[${a+c}]: [${h}](${l.url}).${p}

`}),n){let l=i+o,c=r.indexOf("### Citations"),d=c+15+i.length,p=r.substring(0,c+15),h=r.substring(d);e.setValue(p+l+h)}else{let l=`

### Citations

`+o,c=e.lastLine(),d={line:c,ch:e.getLine(c).length};e.replaceRange(l,d)}}handleError(e,t){let r;e instanceof K.AuthenticationError?r="Invalid Anthropic API key":e instanceof K.RateLimitError?r="Claude rate limit exceeded \u2014 wait and retry":e instanceof K.BadRequestError?r=`Claude request invalid: ${e.message}`:e instanceof K.APIError?r=`Claude API error ${e.status}: ${e.message}`:e instanceof Error?r=`Claude error: ${e.message}`:r=`Claude error: ${String(e)}`,console.error("Claude error:",e),new Ln.Notice(r),t.replaceRange(`
**Error:** ${r}

***
`,t.getCursor())}};var Tt=require("obsidian"),ro=32e3,Xs="https://generativelanguage.googleapis.com/v1beta",ir=class{settings;constructor(e){this.settings=e}updateApiKey(e){this.settings.geminiApiKey=e}async queryGemini(e,t,r,n,i){if(!this.settings.geminiApiKey){new Tt.Notice("Gemini API key not configured. Set GEMINI_API_KEY in .env or in plugin settings.");return}let a=new Date().toISOString(),o=n.getCursor(),l=e.split(`
`).map(h=>`> ${h}`).join(`
`),c=`

***
> [!info] **Gemini Query** (${a})
> **Question:**
${l}
> 
> **Model:** ${t}
> 
>`,d;if(this.settings.headerPosition==="bottom")d={...o};else{n.replaceRange(c,o,o);let h=c.split(`
`),u=h[h.length-1]??"";d={line:o.line+h.length-1,ch:u.length}}let p={contents:[{role:"user",parts:[{text:e}]}],generationConfig:{maxOutputTokens:i?.maxTokens??ro,temperature:i?.temperature??.7}};i?.systemInstruction&&(p.systemInstruction={parts:[{text:i.systemInstruction}]}),i?.enableGrounding!==!1&&(p.tools=[{google_search:{}}]);try{r?await this.handleStreamingResponse(t,p,n,d,c,i):await this.handleNonStreamingResponse(t,p,n,d,c,i)}catch(h){this.handleError(h,n)}}async handleStreamingResponse(e,t,r,n,i,a){let o=`${Xs}/models/${encodeURIComponent(e)}:streamGenerateContent?alt=sse`,l=await activeWindow.fetch(o,{method:"POST",headers:{"Content-Type":"application/json",Accept:"text/event-stream","X-goog-api-key":this.settings.geminiApiKey},body:JSON.stringify(t),cache:"no-store"});if(!l.ok){let v=await l.text();throw new Error(`Gemini HTTP ${l.status}: ${v}`)}if(!l.body)throw new Error("Gemini: no response body");let c=l.body.getReader(),d=new TextDecoder,p="",h={...n},u=null,f="";for(;;){let{done:v,value:S}=await c.read();if(v)break;p+=d.decode(S,{stream:!0});let T=p.split(`
`);p=T.pop()??"";for(let I of T){if(!I.startsWith("data: "))continue;let w=I.slice(6).trim();if(!w)continue;let y;try{y=JSON.parse(w)}catch{continue}let P=y.candidates?.[0];if(!P)continue;let A=(P.content?.parts??[]).map(C=>C.text??"").join("");if(A){f+=A,r.replaceRange(A,h);let C=A.split(`
`);C.length===1?h.ch+=A.length:(h.line+=C.length-1,h.ch=C[C.length-1]?.length??0),r.scrollIntoView({from:h,to:h},!0)}P.groundingMetadata&&(u=this.mergeGrounding(u,P.groundingMetadata))}}await this.afterResponse(r,i,u,f,a)}async handleNonStreamingResponse(e,t,r,n,i,a){let o=`${Xs}/models/${encodeURIComponent(e)}:generateContent`,l=await(0,Tt.request)({url:o,method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","X-goog-api-key":this.settings.geminiApiKey},body:JSON.stringify(t)}),d=JSON.parse(l).candidates?.[0],p=(d?.content?.parts??[]).map(h=>h.text??"").join("");p&&r.replaceRange(p,n),await this.afterResponse(r,i,d?.groundingMetadata??null,p,a)}mergeGrounding(e,t){if(!e)return t;let r={},n=[...new Set([...e.webSearchQueries??[],...t.webSearchQueries??[]])];n.length>0&&(r.webSearchQueries=n);let i=t.groundingChunks??e.groundingChunks;i&&(r.groundingChunks=i);let a=t.groundingSupports??e.groundingSupports;a&&(r.groundingSupports=a);let o=t.searchEntryPoint??e.searchEntryPoint;return o&&(r.searchEntryPoint=o),r}async afterResponse(e,t,r,n,i){if(r){let l=r.webSearchQueries??[];l.length>0&&i?.includeSearchSuggestions!==!1&&this.appendSearchSuggestions(e,l);let c=this.extractCitations(r);if(c.length>0){let d=i?.resolveCitationUrls===!1?c:await this.resolveCitationUrls(c);this.addCitations(e,d)}}if(this.settings.headerPosition==="bottom"&&t){let l=e.lastLine(),c={line:l,ch:e.getLine(l).length};e.replaceRange(`

`+t,c)}let a=e.lastLine(),o={line:a,ch:e.getLine(a).length};e.replaceRange(`

***
`,o)}extractCitations(e){let t=e.groundingChunks??[],r=new Map;for(let a of t){let o=a.web;o?.uri&&(r.has(o.uri)||r.set(o.uri,{url:o.uri,title:o.title||"Source",citedText:""}))}let n=e.groundingSupports??[];for(let a of n){let o=a.segment?.text??"";if(o)for(let l of a.groundingChunkIndices??[]){let c=t[l],d=c?.web?.uri;if(!d)continue;let p=r.get(d);p?p.citedText||(p.citedText=o):r.set(d,{url:d,title:c.web?.title||"Source",citedText:o})}}let i=Array.from(r.values());return console.debug(`[GeminiService] extractCitations \u2014 chunks: ${t.length}; supports: ${n.length}; extracted: ${i.length}`),i}addCitations(e,t){if(t.length===0)return;let r=e.getValue(),n=r.match(/### Citations\n\n([\s\S]*?)(?=\n\n\*\*\*|\n\n### |\n\n## |\n\n# |$)/),i="",a=1;if(n&&n[1]){i=n[1];let l=i.match(/\[(\d+)\]:/g);l&&l.length>0&&(a=Math.max(...l.map(d=>{let p=d.match(/\d+/);return p?parseInt(p[0]):0}))+1)}let o="";if(t.forEach((l,c)=>{let d=l.citedText.replace(/\s*\n\s*/g," ").trim(),p=d?` > ${d}`:"",h=l.title.replace(/\]/g,"\\]");o+=`[${a+c}]: [${h}](${l.url}).${p}

`}),n){let l=i+o,c=r.indexOf("### Citations"),d=c+15+i.length,p=r.substring(0,c+15),h=r.substring(d);e.setValue(p+l+h)}else{let l=`

### Citations

`+o,c=e.lastLine(),d={line:c,ch:e.getLine(c).length};e.replaceRange(l,d)}}appendSearchSuggestions(e,t){let n=`

### Google Searches

${t.map(o=>{let l=o.replace(/`/g,"\\`"),c=`https://www.google.com/search?q=${encodeURIComponent(o)}`;return`- [\`${l}\`](${c})`}).join(`
`)}
`,i=e.lastLine(),a={line:i,ch:e.getLine(i).length};e.replaceRange(n,a)}async resolveCitationUrls(e){let t="vertexaisearch.cloud.google.com",n=async l=>{try{return await Promise.race([(0,Tt.request)({url:l,method:"GET"}),new Promise((d,p)=>activeWindow.setTimeout(()=>p(new Error("timeout")),5e3))])}catch{return null}},i=l=>{let c=l.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]+href\s*=\s*["']([^"']+)["']/i)??l.match(/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']canonical["']/i);if(c&&c[1])return c[1];let d=l.match(/<meta[^>]+property\s*=\s*["']og:url["'][^>]+content\s*=\s*["']([^"']+)["']/i)??l.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:url["']/i);return d&&d[1]?d[1]:null},a=l=>{let c=l.match(/<meta[^>]+property\s*=\s*["']og:title["'][^>]+content\s*=\s*["']([^"']+)["']/i)??l.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:title["']/i);if(c&&c[1])return this.decodeHtmlEntities(c[1]).trim();let d=l.match(/<title[^>]*>([\s\S]*?)<\/title>/i);return d&&d[1]?this.decodeHtmlEntities(d[1]).trim():null},o=async l=>{if(!l.url.includes(t))return l;let c=await n(l.url);if(!c)return console.debug("[GeminiService] resolveCitationUrls \u2014 fetch failed; keeping redirect",l.url),l;let d=i(c),p=a(c);return{...l,url:d??l.url,title:p??l.title}};return Promise.all(e.map(o))}decodeHtmlEntities(e){return e.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&#(\d+);/g,(t,r)=>String.fromCharCode(parseInt(r,10))).replace(/&#x([0-9a-fA-F]+);/g,(t,r)=>String.fromCharCode(parseInt(r,16)))}handleError(e,t){let r=e instanceof Error?e.message:String(e);console.error("Gemini error:",e),new Tt.Notice(`Gemini error: ${r}`),t.replaceRange(`
**Error:** ${r}

***
`,t.getCursor())}};var ar=class{settings;constructor(e){this.settings=e}getPerplexitySystemPrompt(){return this.settings.perplexitySystemPrompt}getPerplexicaSystemPrompt(){return this.settings.perplexicaSystemPrompt}getLMStudioDefaultSystemPrompt(){return this.settings.lmStudioDefaultSystemPrompt}getPerplexityQueryPlaceholder(){return this.settings.perplexityQueryPlaceholder}getPerplexicaQueryPlaceholder(){return this.settings.perplexicaQueryPlaceholder}getLMStudioQueryPlaceholder(){return this.settings.lmStudioQueryPlaceholder}getLMStudioSystemPromptPlaceholder(){return this.settings.lmStudioSystemPromptPlaceholder}getArticleTermPlaceholder(){return this.settings.articleTermPlaceholder}getDeepResearchDescription(){return"\u26A1 Deep Research: Exhaustive research across hundreds of sources with expert-level analysis. Higher cost but comprehensive results. Supports streaming for real-time updates."}getImagesToggleDescription(){return"Include image results from search - images will be integrated throughout the response where appropriate"}getImagesToggleGenericDescription(){return"Include image references throughout the response where appropriate"}getArticleTermDescription(){return"Enter a vocabulary term to generate a comprehensive one-page article with images."}getDeepResearchLoadingNotice(){return"\u{1F50D} Deep research in progress... This may take up to 60 seconds."}getEnterQuestionNotice(){return"Please enter a question"}getEnterTermNotice(){return"Please enter a vocabulary term"}getArticleGeneratorTemplate(e){return this.settings.articleGeneratorTemplate.replace(/{TERM}/g,e)}getEnhanceTemplate(e){return this.settings.enhancePrompt.replace(/{TEXT}/g,e)}getEnhanceWithImagesTemplate(e){return this.settings.enhanceWithImagesPrompt.replace(/{TEXT}/g,e)}getEnhancePrompt(){return this.settings.enhancePrompt}getEnhanceWithImagesPrompt(){return this.settings.enhanceWithImagesPrompt}getDeepResearchArticleTemplate(e){return this.settings.deepResearchArticleTemplate.replace(/{TERM}/g,e)}getImageReferencesPrompt(){return this.settings.imageReferencesPrompt}processTemplate(e){return e.replace(/{{PERPLEXITY_SYSTEM_PROMPT}}/g,this.settings.perplexitySystemPrompt).replace(/{{PERPLEXICA_SYSTEM_PROMPT}}/g,this.settings.perplexicaSystemPrompt).replace(/{{LMSTUDIO_SYSTEM_PROMPT}}/g,this.settings.lmStudioDefaultSystemPrompt)}updateSettings(e){this.settings=e}};var le=require("obsidian"),Zs=[{value:"sonar-pro",label:"sonar-pro",tagline:"Default \u2014 fast web-grounded answers"},{value:"sonar-small",label:"sonar-small",tagline:"Cheaper, faster, less detail"},{value:"sonar-deep-research",label:"sonar-deep-research",tagline:"Exhaustive multi-source research; takes 30\u201360 seconds"},{value:"llama-3.1-sonar-small-128k-online",label:"llama-3.1-sonar-small-128k-online",tagline:"Llama 3.1 small, 128k context, online"},{value:"llama-3.1-sonar-large-128k-online",label:"llama-3.1-sonar-large-128k-online",tagline:"Llama 3.1 large, 128k context, online"}],no="sonar-pro",so=[{value:"",label:"No filter \u2014 search all content"},{value:"day",label:"Past day"},{value:"week",label:"Past week"},{value:"month",label:"Past month"},{value:"year",label:"Past year"},{value:"2years",label:'Past 2+ years (falls back to "year")'},{value:"3years",label:'Past 3+ years (falls back to "year")'},{value:"5years",label:'Past 5+ years (falls back to "year")'}],Br=class extends le.Modal{editor;perplexityService;promptsService;query="";model=no;recencyFilter="";citations=!0;images=!0;relatedQuestions=!1;stream=!0;modelDescEl=null;constructor(e,t,r,n){super(e),this.editor=t,this.perplexityService=r,this.promptsService=n}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("perplexity-modal"),e.empty();let r=e.createDiv({cls:"perplexity-modal__header"});r.createEl("h2",{text:"Ask perplexity",cls:"perplexity-modal__title"}),r.createEl("p",{cls:"perplexity-modal__subtitle",text:"Web-grounded research with native citations. Streams into the active note at the cursor."});let n=e.createDiv({cls:"perplexity-modal__section"});n.createEl("label",{text:"Question",cls:"perplexity-modal__label",attr:{for:"perplexity-modal-query"}});let i=n.createEl("textarea",{cls:"perplexity-modal__textarea",attr:{id:"perplexity-modal-query",rows:"6",placeholder:this.promptsService.getPerplexityQueryPlaceholder()}});i.value=this.query,i.addEventListener("input",()=>{this.query=i.value}),i.addEventListener("keydown",h=>{(h.metaKey||h.ctrlKey)&&h.key==="Enter"&&(h.preventDefault(),this.onSubmit())});let a=e.createDiv({cls:"perplexity-modal__section"});a.createEl("h3",{text:"Model",cls:"perplexity-modal__section-title"}),new le.Setting(a).setName("Model").setDesc(this.modelTagline(this.model)).addDropdown(h=>{Zs.forEach(({value:u,label:f})=>{h.addOption(u,f)}),h.setValue(this.model),h.onChange(u=>{this.model=u,this.applyModelChange(u)})}),this.modelDescEl=a.querySelector(".setting-item-description"),new le.Setting(a).setName("Recency filter").setDesc('Restrict search to recent content. Multi-year options fall back to "year" (the API ceiling).').addDropdown(h=>{so.forEach(({value:u,label:f})=>{h.addOption(u,f)}),h.setValue(this.recencyFilter),h.onChange(u=>{this.recencyFilter=u})});let o=e.createDiv({cls:"perplexity-modal__section"});o.createEl("h3",{text:"Include in response",cls:"perplexity-modal__section-title"}),new le.Setting(o).setName("Citations").setDesc("Append a citations section with source links \u2014 recommended for research notes.").addToggle(h=>h.setValue(this.citations).onChange(u=>{this.citations=u})),new le.Setting(o).setName("Images").setDesc(this.promptsService.getImagesToggleDescription()).addToggle(h=>h.setValue(this.images).onChange(u=>{this.images=u})),new le.Setting(o).setName("Related questions").setDesc("Surface follow-up questions perplexity suggests at the end of the response.").addToggle(h=>h.setValue(this.relatedQuestions).onChange(u=>{this.relatedQuestions=u}));let l=e.createDiv({cls:"perplexity-modal__section"});l.createEl("h3",{text:"Behavior",cls:"perplexity-modal__section-title"}),new le.Setting(l).setName("Stream response").setDesc("Recommended for long answers. Deep research model can take 30\u201360s \u2014 streaming makes progress visible.").addToggle(h=>h.setValue(this.stream).onChange(u=>{this.stream=u}));let c=e.createDiv({cls:"perplexity-modal__footer"});c.createEl("button",{text:"Cancel",cls:"perplexity-modal__button"}).addEventListener("click",()=>this.close()),c.createEl("button",{text:"Ask perplexity",cls:"perplexity-modal__button mod-cta"}).addEventListener("click",()=>{this.onSubmit()}),activeWindow.setTimeout(()=>i.focus(),50)}modelTagline(e){return Zs.find(r=>r.value===e)?.tagline??""}applyModelChange(e){if(this.modelDescEl)if(e==="sonar-deep-research"){let t=this.modelTagline(e),r=this.promptsService.getDeepResearchDescription();this.modelDescEl.textContent=r?`${t} \u2014 ${r}`:t}else this.modelDescEl.textContent=this.modelTagline(e)}async onSubmit(){let e=this.query.trim();if(!e){new le.Notice(this.promptsService.getEnterQuestionNotice());return}let t=e;this.images&&(t=`${e}

${this.promptsService.getImageReferencesPrompt()}`);let r={return_citations:this.citations,return_images:this.images,return_related_questions:this.relatedQuestions,search_recency_filter:this.recencyFilter};this.close(),await this.perplexityService.queryPerplexity(t,this.model,this.stream,this.editor,r)}onClose(){this.contentEl.empty()}};var _e=require("obsidian"),ei=[{value:"webSearch",label:"Web Search",tagline:"General web search via SearXNG \u2014 broad coverage, default choice."},{value:"academicSearch",label:"Academic Search",tagline:"Scholarly papers from arXiv, Google Scholar, PubMed-style sources."},{value:"writingAssistant",label:"Writing Assistant",tagline:"No web search \u2014 pure writing help (drafting, rewriting, summarizing)."},{value:"wolframAlpha",label:"Wolfram Alpha",tagline:"Computational / factual queries \u2014 math, units, structured data."},{value:"youtubeSearch",label:"YouTube Search",tagline:"Video results with transcripts when available."},{value:"redditSearch",label:"Reddit Search",tagline:"Discussion threads \u2014 opinions, anecdotes, community knowledge."}],io="webSearch",ti=[{value:"speed",label:"Speed",tagline:"Fewest sources, quickest answer. Good for simple questions."},{value:"balanced",label:"Balanced",tagline:"Default \u2014 reasonable depth without long waits."},{value:"quality",label:"Quality",tagline:"More sources and deeper synthesis. Slower but more thorough."}],ao="balanced",Ur=class extends _e.Modal{editor;perplexicaService;promptsService;query="";focusMode=io;optimization=ao;images=!1;stream=!1;focusDescEl=null;optimizationDescEl=null;constructor(e,t,r,n){super(e),this.editor=t,this.perplexicaService=r,this.promptsService=n}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("perplexica-modal"),e.empty();let r=e.createDiv({cls:"perplexica-modal__header"});r.createEl("h2",{text:"Ask perplexica / vane",cls:"perplexica-modal__title"}),r.createEl("p",{cls:"perplexica-modal__subtitle",text:"Self-hosted, source-grounded answers via your local perplexica / vane instance. Streams into the active note at the cursor."});let n=e.createDiv({cls:"perplexica-modal__section"});n.createEl("label",{text:"Question",cls:"perplexica-modal__label",attr:{for:"perplexica-modal-query"}});let i=n.createEl("textarea",{cls:"perplexica-modal__textarea",attr:{id:"perplexica-modal-query",rows:"6",placeholder:this.promptsService.getPerplexicaQueryPlaceholder()}});i.value=this.query,i.addEventListener("input",()=>{this.query=i.value}),i.addEventListener("keydown",f=>{(f.metaKey||f.ctrlKey)&&f.key==="Enter"&&(f.preventDefault(),this.onSubmit())});let a=e.createDiv({cls:"perplexica-modal__section"});a.createEl("h3",{text:"Search",cls:"perplexica-modal__section-title"});let o=new _e.Setting(a).setName("Focus mode").setDesc(this.focusTagline(this.focusMode)).addDropdown(f=>{ei.forEach(({value:v,label:S})=>{f.addOption(v,S)}),f.setValue(this.focusMode),f.onChange(v=>{this.focusMode=v,this.focusDescEl&&(this.focusDescEl.textContent=this.focusTagline(v))})});this.focusDescEl=o.descEl;let l=new _e.Setting(a).setName("Optimization").setDesc(this.optimizationTagline(this.optimization)).addDropdown(f=>{ti.forEach(({value:v,label:S})=>{f.addOption(v,S)}),f.setValue(this.optimization),f.onChange(v=>{this.optimization=v,this.optimizationDescEl&&(this.optimizationDescEl.textContent=this.optimizationTagline(v))})});this.optimizationDescEl=l.descEl;let c=e.createDiv({cls:"perplexica-modal__section"});c.createEl("h3",{text:"Include in response",cls:"perplexica-modal__section-title"}),new _e.Setting(c).setName("Images").setDesc(this.promptsService.getImagesToggleGenericDescription()).addToggle(f=>f.setValue(this.images).onChange(v=>{this.images=v}));let d=e.createDiv({cls:"perplexica-modal__section"});d.createEl("h3",{text:"Behavior",cls:"perplexica-modal__section-title"}),new _e.Setting(d).setName("Stream response").setDesc("Write tokens into the note as they arrive \u2014 useful for long answers and slow local models.").addToggle(f=>f.setValue(this.stream).onChange(v=>{this.stream=v}));let p=e.createDiv({cls:"perplexica-modal__footer"});p.createEl("button",{text:"Cancel",cls:"perplexica-modal__button"}).addEventListener("click",()=>this.close()),p.createEl("button",{text:"Ask perplexica / vane",cls:"perplexica-modal__button mod-cta"}).addEventListener("click",()=>{this.onSubmit()}),activeWindow.setTimeout(()=>i.focus(),50)}focusTagline(e){return ei.find(t=>t.value===e)?.tagline??""}optimizationTagline(e){return ti.find(t=>t.value===e)?.tagline??""}async onSubmit(){let e=this.query.trim();if(!e){new _e.Notice(this.promptsService.getEnterQuestionNotice());return}let t=e;this.images&&(t=`${e}

${this.promptsService.getImageReferencesPrompt()}`);let r={return_images:this.images};this.close(),await this.perplexicaService.queryPerplexica(t,this.focusMode,this.optimization,this.stream,this.editor,r)}onClose(){this.contentEl.empty()}};var me=require("obsidian"),ri=[{value:"ibm/granite-3.2-8b",label:"IBM Granite 3.2 8B",tagline:"IBM Granite \u2014 strong on code and structured reasoning."},{value:"microsoft/phi-4-reasoning-plus",label:"Phi-4 Reasoning Plus",tagline:"Microsoft Phi-4 \u2014 small, fast model tuned for chain-of-thought reasoning."},{value:"google/gemma-3-12b",label:"Gemma 3 12B",tagline:"Google Gemma 3 \u2014 solid all-rounder open model."},{value:"meta-llama/llama-3.2-3b-instruct",label:"Llama 3.2 3B Instruct",tagline:"Meta Llama 3.2 \u2014 small instruction-tuned model, fastest of the bundled choices."},{value:"custom-model",label:"custom-model",tagline:"Generic placeholder \u2014 LM Studio will route this to whichever model is currently loaded."}],oo="ibm/granite-3.2-8b",ni=2048,lo=.7,Wr=class extends me.Modal{editor;lmStudioService;promptsService;query="";model=oo;systemPrompt="";maxTokens=ni;temperature=lo;images=!1;stream=!0;modelDescEl=null;constructor(e,t,r,n){super(e),this.editor=t,this.lmStudioService=r,this.promptsService=n}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("lmstudio-modal"),e.empty();let r=e.createDiv({cls:"lmstudio-modal__header"});r.createEl("h2",{text:"Ask lm studio",cls:"lmstudio-modal__title"}),r.createEl("p",{cls:"lmstudio-modal__subtitle",text:"Run queries against your local lm studio server. Streams into the active note at the cursor."});let n=e.createDiv({cls:"lmstudio-modal__section"});n.createEl("label",{text:"Question",cls:"lmstudio-modal__label",attr:{for:"lmstudio-modal-query"}});let i=n.createEl("textarea",{cls:"lmstudio-modal__textarea",attr:{id:"lmstudio-modal-query",rows:"6",placeholder:this.promptsService.getLMStudioQueryPlaceholder()}});i.value=this.query,i.addEventListener("input",()=>{this.query=i.value}),i.addEventListener("keydown",v=>{(v.metaKey||v.ctrlKey)&&v.key==="Enter"&&(v.preventDefault(),this.onSubmit())});let a=e.createDiv({cls:"lmstudio-modal__section"});a.createEl("h3",{text:"Model",cls:"lmstudio-modal__section-title"});let o=new me.Setting(a).setName("Model").setDesc(this.modelTagline(this.model)).addDropdown(v=>{ri.forEach(({value:S,label:T})=>{v.addOption(S,T)}),v.setValue(this.model),v.onChange(S=>{this.model=S,this.modelDescEl&&(this.modelDescEl.textContent=this.modelTagline(S))})});this.modelDescEl=o.descEl,new me.Setting(a).setName("Max tokens").setDesc("Upper bound on response length. Local models cap lower than cloud \u2014 2048 is a safe default.").addText(v=>v.setValue(String(this.maxTokens)).onChange(S=>{let T=parseInt(S,10);this.maxTokens=Number.isFinite(T)&&T>0?T:ni})),new me.Setting(a).setName("Temperature").setDesc("Higher = more creative / varied. 0.7 is the conventional default. Slide to 0 for deterministic output.").addSlider(v=>v.setLimits(0,2,.1).setValue(this.temperature).setDynamicTooltip().onChange(S=>{this.temperature=S}));let l=e.createDiv({cls:"lmstudio-modal__section"});l.createEl("h3",{text:"System prompt (optional)",cls:"lmstudio-modal__section-title"}),l.createEl("p",{cls:"lmstudio-modal__hint",text:"Override the default system prompt for this request. Leave blank to use the plugin default."});let c=l.createEl("textarea",{cls:"lmstudio-modal__textarea lmstudio-modal__textarea--system",attr:{rows:"3",placeholder:this.promptsService.getLMStudioSystemPromptPlaceholder()}});c.value=this.systemPrompt,c.addEventListener("input",()=>{this.systemPrompt=c.value});let d=e.createDiv({cls:"lmstudio-modal__section"});d.createEl("h3",{text:"Include in response",cls:"lmstudio-modal__section-title"}),new me.Setting(d).setName("Images").setDesc(this.promptsService.getImagesToggleGenericDescription()).addToggle(v=>v.setValue(this.images).onChange(S=>{this.images=S}));let p=e.createDiv({cls:"lmstudio-modal__section"});p.createEl("h3",{text:"Behavior",cls:"lmstudio-modal__section-title"}),new me.Setting(p).setName("Stream response").setDesc("Write tokens into the note as they arrive \u2014 recommended for long answers and slow local models.").addToggle(v=>v.setValue(this.stream).onChange(S=>{this.stream=S}));let h=e.createDiv({cls:"lmstudio-modal__footer"});h.createEl("button",{text:"Cancel",cls:"lmstudio-modal__button"}).addEventListener("click",()=>this.close()),h.createEl("button",{text:"Ask lm studio",cls:"lmstudio-modal__button mod-cta"}).addEventListener("click",()=>{this.onSubmit()}),activeWindow.setTimeout(()=>i.focus(),50)}modelTagline(e){return ri.find(t=>t.value===e)?.tagline??""}async onSubmit(){let e=this.query.trim();if(!e){new me.Notice(this.promptsService.getEnterQuestionNotice());return}let t=e;this.images&&(t=`${e}

${this.promptsService.getImageReferencesPrompt()}`);let r={max_tokens:this.maxTokens,temperature:this.temperature,return_images:this.images},n=this.systemPrompt.trim();n&&(r.system_prompt=n),this.close(),await this.lmStudioService.queryLMStudio(t,this.model,this.stream,this.editor,r)}onClose(){this.contentEl.empty()}};var ge=require("obsidian"),si=[{value:"claude-opus-4-7",label:"Opus 4.7",tagline:"Most capable \u2014 research / agentic / vision"},{value:"claude-opus-4-6",label:"Opus 4.6",tagline:"Previous-generation Opus"},{value:"claude-sonnet-4-6",label:"Sonnet 4.6",tagline:"Best speed / intelligence balance"},{value:"claude-haiku-4-5",label:"Haiku 4.5",tagline:"Fastest, lowest cost"}],co="claude-opus-4-7",po=[{value:"low",label:"Low \u2014 fastest, least thorough"},{value:"medium",label:"Medium \u2014 balanced"},{value:"high",label:"High \u2014 recommended for research"},{value:"xhigh",label:"xHigh \u2014 deep agentic (Opus 4.7)"},{value:"max",label:"Max \u2014 Opus only, highest cost"}],Gr=class extends ge.Modal{editor;claudeService;query="";model=co;effort="high";webSearch=!0;thinking=!1;stream=!0;constructor(e,t,r,n){super(e),this.editor=t,this.claudeService=r}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("claude-modal"),e.empty();let r=e.createDiv({cls:"claude-modal__header"});r.createEl("h2",{text:"Ask Claude",cls:"claude-modal__title"}),r.createEl("p",{cls:"claude-modal__subtitle",text:"Server-side web search with native citations. Streams into the active note at the cursor."});let n=e.createDiv({cls:"claude-modal__section"});n.createEl("label",{text:"Question",cls:"claude-modal__label",attr:{for:"claude-modal-query"}});let i=n.createEl("textarea",{cls:"claude-modal__textarea",attr:{id:"claude-modal-query",rows:"6",placeholder:"What would you like to research? Multi-line OK."}});i.value=this.query,i.addEventListener("input",()=>{this.query=i.value});let a=e.createDiv({cls:"claude-modal__section"});a.createEl("h3",{text:"Model",cls:"claude-modal__section-title"}),new ge.Setting(a).setName("Model").setDesc(this.modelTagline(this.model)).addDropdown(p=>{si.forEach(({value:h,label:u})=>{p.addOption(h,u)}),p.setValue(this.model),p.onChange(h=>{this.model=h;let u=a.querySelector(".setting-item:nth-of-type(1) .setting-item-description");u&&(u.textContent=this.modelTagline(h))})}),new ge.Setting(a).setName("Effort").setDesc("Controls thinking depth and overall token spend. Higher = more thorough; more tokens.").addDropdown(p=>{po.forEach(({value:h,label:u})=>{p.addOption(h,u)}),p.setValue(this.effort),p.onChange(h=>{this.effort=h})});let o=e.createDiv({cls:"claude-modal__section"});o.createEl("h3",{text:"Behavior",cls:"claude-modal__section-title"}),new ge.Setting(o).setName("Enable web search").setDesc("Server-side web_search_20250305 tool. Returns per-claim citations attached to text blocks.").addToggle(p=>p.setValue(this.webSearch).onChange(h=>{this.webSearch=h})),new ge.Setting(o).setName("Adaptive thinking").setDesc("Lets Claude reason before answering. Higher quality on complex questions; adds latency and tokens.").addToggle(p=>p.setValue(this.thinking).onChange(h=>{this.thinking=h})),new ge.Setting(o).setName("Stream response").setDesc("Recommended for long answers \u2014 avoids HTTP timeouts and writes incrementally to the note.").addToggle(p=>p.setValue(this.stream).onChange(h=>{this.stream=h}));let l=e.createDiv({cls:"claude-modal__footer"});l.createEl("button",{text:"Cancel",cls:"claude-modal__button"}).addEventListener("click",()=>this.close()),l.createEl("button",{text:"Ask Claude",cls:"claude-modal__button mod-cta"}).addEventListener("click",()=>{this.onSubmit()}),i.addEventListener("keydown",p=>{(p.metaKey||p.ctrlKey)&&p.key==="Enter"&&(p.preventDefault(),this.onSubmit())}),activeWindow.setTimeout(()=>i.focus(),50)}modelTagline(e){let t=si.find(r=>r.value===e);return t?t.tagline:""}async onSubmit(){let e=this.query.trim();if(!e){new ge.Notice("Please enter a question for Claude.");return}let t={enableWebSearch:this.webSearch,enableThinking:this.thinking,effort:this.effort};this.close(),await this.claudeService.queryClaude(e,this.model,this.stream,this.editor,t)}onClose(){this.contentEl.empty()}};var fe=require("obsidian"),ii=[{value:"gemini-flash-latest",label:"Gemini Flash (latest)",tagline:"Always-current flash alias \u2014 free-tier friendly"},{value:"gemini-pro-latest",label:"Gemini Pro (latest)",tagline:"Always-current pro alias \u2014 deepest reasoning"},{value:"gemini-2.5-pro",label:"Gemini 2.5 Pro",tagline:"Pinned 2.5 Pro \u2014 deepest reasoning + grounding"},{value:"gemini-2.5-flash",label:"Gemini 2.5 Flash",tagline:"Pinned 2.5 Flash \u2014 faster, lower cost"}],uo="gemini-flash-latest",Hr=class extends fe.Modal{editor;geminiService;query="";model=uo;grounding=!0;suggestions=!0;resolveUrls=!0;stream=!0;constructor(e,t,r,n,i){super(e),this.editor=t,this.geminiService=r,i?.defaultModel&&(this.model=i.defaultModel),i?.enableGrounding!==void 0&&(this.grounding=i.enableGrounding),i?.includeSearchSuggestions!==void 0&&(this.suggestions=i.includeSearchSuggestions),i?.resolveCitationUrls!==void 0&&(this.resolveUrls=i.resolveCitationUrls)}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("gemini-modal"),e.empty();let r=e.createDiv({cls:"gemini-modal__header"});r.createEl("h2",{text:"Ask Gemini",cls:"gemini-modal__title"}),r.createEl("p",{cls:"gemini-modal__subtitle",text:"Google search grounding with per-segment citations. Streams into the active note at the cursor."});let n=e.createDiv({cls:"gemini-modal__section"});n.createEl("label",{text:"Question",cls:"gemini-modal__label",attr:{for:"gemini-modal-query"}});let i=n.createEl("textarea",{cls:"gemini-modal__textarea",attr:{id:"gemini-modal-query",rows:"6",placeholder:"What would you like to research? Multi-line OK."}});i.value=this.query,i.addEventListener("input",()=>{this.query=i.value});let a=e.createDiv({cls:"gemini-modal__section"});a.createEl("h3",{text:"Model",cls:"gemini-modal__section-title"}),new fe.Setting(a).setName("Model").setDesc(this.modelTagline(this.model)).addDropdown(p=>{ii.forEach(({value:h,label:u})=>{p.addOption(h,u)}),p.setValue(this.model),p.onChange(h=>{this.model=h;let u=a.querySelector(".setting-item:nth-of-type(1) .setting-item-description");u&&(u.textContent=this.modelTagline(h))})});let o=e.createDiv({cls:"gemini-modal__section"});o.createEl("h3",{text:"Behavior",cls:"gemini-modal__section-title"}),new fe.Setting(o).setName("Enable Google search grounding").setDesc("Server-side Google_search tool. Emits per-segment grounding supports that survive into citations.").addToggle(p=>p.setValue(this.grounding).onChange(h=>{this.grounding=h})),new fe.Setting(o).setName("Append Google searches list").setDesc("Markdown bullet list of the queries Gemini ran, each linked to Google search.").addToggle(p=>p.setValue(this.suggestions).onChange(h=>{this.suggestions=h})),new fe.Setting(o).setName("Resolve citation urls").setDesc("Resolve Google grounding redirects to durable source urls. Off = fast but citations expire in ~30 days.").addToggle(p=>p.setValue(this.resolveUrls).onChange(h=>{this.resolveUrls=h})),new fe.Setting(o).setName("Stream response").setDesc("Recommended for long answers \u2014 avoids HTTP timeouts and writes incrementally to the note.").addToggle(p=>p.setValue(this.stream).onChange(h=>{this.stream=h}));let l=e.createDiv({cls:"gemini-modal__footer"});l.createEl("button",{text:"Cancel",cls:"gemini-modal__button"}).addEventListener("click",()=>this.close()),l.createEl("button",{text:"Ask Gemini",cls:"gemini-modal__button mod-cta"}).addEventListener("click",()=>{this.onSubmit()}),i.addEventListener("keydown",p=>{(p.metaKey||p.ctrlKey)&&p.key==="Enter"&&(p.preventDefault(),this.onSubmit())}),activeWindow.setTimeout(()=>i.focus(),50)}modelTagline(e){let t=ii.find(r=>r.value===e);return t?t.tagline:""}async onSubmit(){let e=this.query.trim();if(!e){new fe.Notice("Please enter a question for Gemini.");return}let t={enableGrounding:this.grounding,includeSearchSuggestions:this.suggestions,resolveCitationUrls:this.resolveUrls};this.close(),await this.geminiService.queryGemini(e,this.model,this.stream,this.editor,t)}onClose(){this.contentEl.empty()}};var or=require("obsidian"),Et=class extends or.Modal{config;urlInput;constructor(e,t){super(e),this.config=t}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("url-update-modal"),e.empty(),e.createDiv({cls:"url-update-modal__header"}).createEl("h2",{text:this.config.title,cls:"url-update-modal__title"});let n=e.createEl("form"),i=n.createDiv({cls:"url-update-modal__section"});i.createEl("label",{text:this.config.label,cls:"url-update-modal__label",attr:{for:"url-input"}}),this.urlInput=i.createEl("input",{type:"text",value:this.config.currentValue,cls:"url-update-modal__input",attr:{id:"url-input",placeholder:this.config.placeholder}});let a=e.createDiv({cls:"url-update-modal__footer"}),o=a.createEl("button",{type:"button",text:"Cancel",cls:"url-update-modal__button"}),l=a.createEl("button",{type:"submit",text:"Save",cls:"url-update-modal__button mod-cta"});o.onclick=()=>this.close(),n.onsubmit=c=>{c.preventDefault(),this.onSubmit()},l.onclick=c=>{c.preventDefault(),this.onSubmit()}}async onSubmit(){let e=this.urlInput.value.trim();if(e)try{await this.config.onSave(e),new or.Notice(`URL updated to: ${e}`),this.close()}catch(t){let r=t instanceof Error?t.message:String(t);new or.Notice(`Failed to save URL: ${r}`)}}onClose(){let{contentEl:e}=this;e.empty()}};var ce=require("obsidian"),ai=[{value:"sonar-deep-research",label:"sonar-deep-research",tagline:"Recommended \u2014 exhaustive multi-source article research; takes 30\u201360 seconds"},{value:"sonar-pro",label:"sonar-pro",tagline:"Faster, less detail"},{value:"sonar-small",label:"sonar-small",tagline:"Cheapest, briefest"},{value:"llama-3.1-sonar-small-128k-online",label:"llama-3.1-sonar-small-128k-online",tagline:"Llama 3.1 small, 128k context, online"},{value:"llama-3.1-sonar-large-128k-online",label:"llama-3.1-sonar-large-128k-online",tagline:"Llama 3.1 large, 128k context, online"}],ho="sonar-deep-research",mo=[{value:"",label:"No filter \u2014 search all content"},{value:"day",label:"Past day"},{value:"week",label:"Past week"},{value:"month",label:"Past month"},{value:"year",label:"Past year"},{value:"2years",label:'Past 2+ years (falls back to "year")'},{value:"3years",label:'Past 3+ years (falls back to "year")'},{value:"5years",label:'Past 5+ years (falls back to "year")'}],jr=class extends ce.Modal{editor;perplexityService;promptsService;term="";model=ho;recencyFilter="";citations=!0;images=!0;relatedQuestions=!1;stream=!0;modelDescEl=null;compatibilityWarningEl=null;loadingInterval=null;constructor(e,t,r,n){super(e),this.editor=t,this.perplexityService=r,this.promptsService=n;let i=this.app.workspace.getActiveFile();i&&(this.term=i.basename)}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("article-generator-modal"),e.empty();let r=e.createDiv({cls:"article-generator-modal__header"});r.createEl("h2",{text:"Generate one-page article",cls:"article-generator-modal__title"}),r.createEl("p",{cls:"article-generator-modal__subtitle",text:"Generates a structured article from a single vocabulary term. Streams into the active note."});let n=e.createDiv({cls:"article-generator-modal__section"});n.createEl("label",{text:"Vocabulary term",cls:"article-generator-modal__label",attr:{for:"article-generator-modal-term"}});let i=n.createEl("input",{cls:"article-generator-modal__input",attr:{id:"article-generator-modal-term",type:"text",placeholder:this.promptsService.getArticleTermPlaceholder()}});i.value=this.term,i.addEventListener("input",()=>{this.term=i.value}),i.addEventListener("keydown",u=>{(u.metaKey||u.ctrlKey)&&u.key==="Enter"&&(u.preventDefault(),this.onSubmit())}),n.createEl("p",{cls:"article-generator-modal__hint",text:this.promptsService.getArticleTermDescription()});let a=e.createDiv({cls:"article-generator-modal__section"});a.createEl("h3",{text:"Model",cls:"article-generator-modal__section-title"}),new ce.Setting(a).setName("Model").setDesc(this.modelTagline(this.model)).addDropdown(u=>{ai.forEach(({value:f,label:v})=>{u.addOption(f,v)}),u.setValue(this.model),u.onChange(f=>{this.model=f,this.applyModelChange(f),this.updateCompatibilityWarning()})}),this.modelDescEl=a.querySelector(".setting-item-description"),this.applyModelChange(this.model),new ce.Setting(a).setName("Recency filter").setDesc('Restrict search to recent content. Multi-year options fall back to "year" (the API ceiling).').addDropdown(u=>{mo.forEach(({value:f,label:v})=>{u.addOption(f,v)}),u.setValue(this.recencyFilter),u.onChange(f=>{this.recencyFilter=f})});let o=e.createDiv({cls:"article-generator-modal__section"});o.createEl("h3",{text:"Include in response",cls:"article-generator-modal__section-title"}),new ce.Setting(o).setName("Citations").setDesc("Append a citations section with source links \u2014 recommended for research articles.").addToggle(u=>u.setValue(this.citations).onChange(f=>{this.citations=f}));let l=new ce.Setting(o).setName("Images").setDesc(this.promptsService.getImagesToggleDescription()).addToggle(u=>u.setValue(this.images).onChange(f=>{this.images=f,this.updateCompatibilityWarning()}));this.compatibilityWarningEl=l.settingEl.createDiv({cls:"article-generator-modal__warning"}),this.updateCompatibilityWarning(),new ce.Setting(o).setName("Related questions").setDesc("Surface follow-up questions perplexity suggests at the end of the response.").addToggle(u=>u.setValue(this.relatedQuestions).onChange(f=>{this.relatedQuestions=f}));let c=e.createDiv({cls:"article-generator-modal__section"});c.createEl("h3",{text:"Behavior",cls:"article-generator-modal__section-title"}),new ce.Setting(c).setName("Stream response").setDesc("Recommended for articles \u2014 see content as it generates. Note: Deep research with streaming may not support images.").addToggle(u=>u.setValue(this.stream).onChange(f=>{this.stream=f}));let d=e.createDiv({cls:"article-generator-modal__footer"});d.createEl("button",{text:"Cancel",cls:"article-generator-modal__button"}).addEventListener("click",()=>this.close()),d.createEl("button",{text:"Generate article",cls:"article-generator-modal__button mod-cta"}).addEventListener("click",()=>{this.onSubmit()}),activeWindow.setTimeout(()=>i.focus(),50)}modelTagline(e){return ai.find(r=>r.value===e)?.tagline??""}applyModelChange(e){if(this.modelDescEl)if(e==="sonar-deep-research"){let t=this.modelTagline(e),r=this.promptsService.getDeepResearchDescription();this.modelDescEl.textContent=r?`${t} \u2014 ${r}`:t}else this.modelDescEl.textContent=this.modelTagline(e)}updateCompatibilityWarning(){if(!this.compatibilityWarningEl)return;this.images&&this.model==="sonar-deep-research"?(this.compatibilityWarningEl.textContent="\u26A0 Images are unstable in deep research mode. Consider a different model for reliable image support.",this.compatibilityWarningEl.addClass("is-active")):(this.compatibilityWarningEl.textContent="",this.compatibilityWarningEl.removeClass("is-active"))}async showDeepResearchLoading(){let e="\u{1F50D} Deep Research Loading...",t=this.editor.getCursor();this.editor.replaceRange(e,t);let r=0,n=3;return this.loadingInterval=window.setInterval(()=>{r=(r+1)%(n+1);let i="\u{1F50D} Deep Research Loading"+".".repeat(r),o=this.editor.getCursor().line,l=this.editor.getLine(o);if(l.includes("\u{1F50D} Deep Research Loading")){let c=l.indexOf("\u{1F50D} Deep Research Loading"),d=l.length;this.editor.replaceRange(i,{line:o,ch:c},{line:o,ch:d})}},500),new Promise(i=>{activeWindow.setTimeout(()=>i(),100)})}async onSubmit(){let e=this.term.trim();if(!e){new ce.Notice(this.promptsService.getEnterTermNotice());return}let t=this.model==="sonar-deep-research",r=t?this.promptsService.getDeepResearchArticleTemplate(e):this.promptsService.getArticleGeneratorTemplate(e);this.images&&(r=`${r}

${this.promptsService.getImageReferencesPrompt()}`);let n={return_citations:this.citations,return_images:this.images,return_related_questions:this.relatedQuestions,search_recency_filter:this.recencyFilter};this.close(),t&&await this.showDeepResearchLoading();try{await this.perplexityService.queryPerplexity(r,this.model,this.stream,this.editor,n)}finally{this.loadingInterval!==null&&(window.clearInterval(this.loadingInterval),this.loadingInterval=null)}}onClose(){this.loadingInterval!==null&&(window.clearInterval(this.loadingInterval),this.loadingInterval=null),this.contentEl.empty()}};var At=require("obsidian"),zr=class extends At.Modal{editor;perplexityService;promptsService;selectedText;prompt;enhanceBtn;constructor(e,t,r,n,i){super(e),this.editor=t,this.perplexityService=r,this.promptsService=n,this.selectedText=i,this.prompt=this.promptsService.getEnhanceTemplate(this.selectedText)}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("text-enhancement-modal"),e.empty();let r=e.createDiv({cls:"text-enhancement-modal__header"});r.createEl("h2",{text:"Enhance text with perplexity",cls:"text-enhancement-modal__title"}),r.createEl("p",{cls:"text-enhancement-modal__subtitle",text:"Rewrite or expand selected text via perplexity (sonar-pro). Streams into the active note at the cursor with citations."});let n=e.createDiv({cls:"text-enhancement-modal__section"});n.createEl("label",{text:"Selected text",cls:"text-enhancement-modal__label"});let i=n.createEl("textarea",{cls:"text-enhancement-modal__textarea text-enhancement-modal__textarea--readonly",attr:{rows:"6",readonly:"readonly"}});i.value=this.selectedText;let a=e.createDiv({cls:"text-enhancement-modal__section"});a.createEl("label",{text:"Enhancement prompt",cls:"text-enhancement-modal__label",attr:{for:"text-enhancement-modal-prompt"}}),a.createEl("p",{cls:"text-enhancement-modal__hint",text:"Pre-filled from the plugin template \u2014 edit to refine the rewrite instructions before submitting."});let o=a.createEl("textarea",{cls:"text-enhancement-modal__textarea",attr:{id:"text-enhancement-modal-prompt",rows:"8",placeholder:"Enter your enhancement prompt\u2026"}});o.value=this.prompt,o.addEventListener("input",()=>{this.prompt=o.value}),o.addEventListener("keydown",d=>{(d.metaKey||d.ctrlKey)&&d.key==="Enter"&&(d.preventDefault(),this.onSubmit())});let l=e.createDiv({cls:"text-enhancement-modal__footer"});l.createEl("button",{text:"Cancel",cls:"text-enhancement-modal__button"}).addEventListener("click",()=>this.close()),this.enhanceBtn=l.createEl("button",{text:"Enhance text",cls:"text-enhancement-modal__button mod-cta"}),this.enhanceBtn.addEventListener("click",()=>{this.onSubmit()}),activeWindow.setTimeout(()=>o.focus(),50)}async onSubmit(){let e=this.prompt.trim();if(!e){new At.Notice("Please enter an enhancement prompt.");return}try{this.enhanceBtn.disabled=!0,this.enhanceBtn.textContent="Enhancing\u2026",this.close();let t=this.editor.getCursor();this.editor.replaceRange(`

`,t),await this.perplexityService.queryPerplexity(e,"sonar-pro",!0,this.editor,{return_citations:!0,return_images:!1,return_related_questions:!1}),new At.Notice("Text enhancement completed.")}catch(t){console.error("Error enhancing text:",t),new At.Notice("Failed to enhance text. Check console for details.")}finally{this.enhanceBtn&&(this.enhanceBtn.disabled=!1,this.enhanceBtn.textContent="Enhance text")}}onClose(){this.contentEl.empty()}};var Ct=require("obsidian"),Vr=class extends Ct.Modal{editor;perplexityService;promptsService;selectedText;prompt;fetchBtn;constructor(e,t,r,n,i){super(e),this.editor=t,this.perplexityService=r,this.promptsService=n,this.selectedText=i,this.prompt=this.promptsService.getEnhanceWithImagesTemplate(this.selectedText)}onOpen(){let{contentEl:e,modalEl:t}=this;t.addClass("text-enhancement-with-images-modal"),e.empty();let r=e.createDiv({cls:"text-enhancement-with-images-modal__header"});r.createEl("h2",{text:"Get related images",cls:"text-enhancement-with-images-modal__title"}),r.createEl("p",{cls:"text-enhancement-with-images-modal__subtitle",text:"Find images related to selected text via perplexity (sonar-pro). Streams image markers into the active note at the cursor."});let n=e.createDiv({cls:"text-enhancement-with-images-modal__section"});n.createEl("label",{text:"Selected text",cls:"text-enhancement-with-images-modal__label"});let i=n.createEl("textarea",{cls:"text-enhancement-with-images-modal__textarea text-enhancement-with-images-modal__textarea--readonly",attr:{rows:"6",readonly:"readonly"}});i.value=this.selectedText;let a=e.createDiv({cls:"text-enhancement-with-images-modal__section"});a.createEl("label",{text:"Image request prompt",cls:"text-enhancement-with-images-modal__label",attr:{for:"text-enhancement-with-images-modal-prompt"}}),a.createEl("p",{cls:"text-enhancement-with-images-modal__hint",text:"Pre-filled from the plugin template \u2014 edit to refine which kinds of images to surface."});let o=a.createEl("textarea",{cls:"text-enhancement-with-images-modal__textarea",attr:{id:"text-enhancement-with-images-modal-prompt",rows:"8",placeholder:"Enter your image request prompt\u2026"}});o.value=this.prompt,o.addEventListener("input",()=>{this.prompt=o.value}),o.addEventListener("keydown",d=>{(d.metaKey||d.ctrlKey)&&d.key==="Enter"&&(d.preventDefault(),this.onSubmit())});let l=e.createDiv({cls:"text-enhancement-with-images-modal__footer"});l.createEl("button",{text:"Cancel",cls:"text-enhancement-with-images-modal__button"}).addEventListener("click",()=>this.close()),this.fetchBtn=l.createEl("button",{text:"Get related images",cls:"text-enhancement-with-images-modal__button mod-cta"}),this.fetchBtn.addEventListener("click",()=>{this.onSubmit()}),activeWindow.setTimeout(()=>o.focus(),50)}async onSubmit(){let e=this.prompt.trim();if(!e){new Ct.Notice("Please enter an image request prompt.");return}try{this.fetchBtn.disabled=!0,this.fetchBtn.textContent="Getting related images\u2026",this.close();let t=this.editor.getCursor();this.editor.replaceRange(`

`,t),await this.perplexityService.queryPerplexity(e,"sonar-pro",!0,this.editor,{return_citations:!1,return_images:!0,return_related_questions:!1}),new Ct.Notice("Related images added successfully.")}catch(t){console.error("Error getting related images:",t),new Ct.Notice("Failed to get related images. Check console for details.")}finally{this.fetchBtn&&(this.fetchBtn.disabled=!1,this.fetchBtn.textContent="Get related images")}}onClose(){this.contentEl.empty()}};var oi=require("obsidian"),Kr=class extends oi.FuzzySuggestModal{items;callback;constructor(e,t,r){super(e),this.items=t,this.callback=r,this.setPlaceholder("Pick a directory template\u2026")}getItems(){return this.items}getItemText(e){let t=e.description?` \u2014 ${e.description}`:"";return`${e.title}${t}`}onChooseItem(e){this.callback(e)}};var Ke=require("obsidian"),li=[{id:"sonar-pro",label:"Sonar Pro \u2014 grounded search + citations, fast"},{id:"sonar-reasoning-pro",label:"Sonar Reasoning Pro \u2014 adds chain-of-thought"},{id:"sonar",label:"Sonar \u2014 lightweight, fastest"},{id:"sonar-reasoning",label:"Sonar Reasoning \u2014 lightweight + reasoning"},{id:"sonar-deep-research",label:"Sonar Deep Research \u2014 exhaustive, minutes-long"}];function Fn(s){let e=s.template.cftConfig.model;return typeof e=="string"&&e.length>0?e:"sonar-pro"}var Qr=class extends Ke.Modal{choices;onRun;selectedIndex=0;selectedModel;constructor(e,t,r){if(super(e),t.length===0)throw new Error("DirectoryTemplateRunModal requires at least one template choice");this.choices=t,this.onRun=r,this.selectedModel=Fn(this.selected())}selected(){let e=this.choices[this.selectedIndex];if(e)return e;let t=this.choices[0];if(t)return t;throw new Error("DirectoryTemplateRunModal: choices unexpectedly empty")}onOpen(){this.render()}onClose(){this.contentEl.empty()}render(){let{contentEl:e}=this;e.empty(),e.createEl("h3",{text:"Apply directory template"}),this.choices.length>1?new Ke.Setting(e).setName("Template").setDesc("Which template to apply to this file.").addDropdown(r=>{this.choices.forEach((n,i)=>{r.addOption(String(i),n.title)}),r.setValue(String(this.selectedIndex)),r.onChange(n=>{this.selectedIndex=Number(n),this.selectedModel=Fn(this.selected()),this.render()})}):new Ke.Setting(e).setName("Template").setDesc(this.selected().title);let t=Fn(this.selected());new Ke.Setting(e).setName("Model").setDesc(`Perplexity model for this run. Template default: ${t}.`).addDropdown(r=>{for(let n of li)r.addOption(n.id,n.label);li.some(n=>n.id===this.selectedModel)||r.addOption(this.selectedModel,this.selectedModel),r.setValue(this.selectedModel),r.onChange(n=>{this.selectedModel=n})}),new Ke.Setting(e).addButton(r=>r.setButtonText("Run").setCta().onClick(()=>{let n=this.selected(),i=this.selectedModel;this.close(),this.onRun(n.template,i)})).addButton(r=>r.setButtonText("Cancel").onClick(()=>{this.close()}))}};var Jr=require("obsidian"),Yr=class extends Jr.FuzzySuggestModal{callback;constructor(e,t){super(e),this.callback=t,this.setPlaceholder("Pick a folder\u2026")}getItems(){let e=[],t=r=>{e.push(r);for(let n of r.children)n instanceof Jr.TFolder&&t(n)};return t(this.app.vault.getRoot()),e}getItemText(e){return e.path===""?"/":e.path}onChooseItem(e){this.callback(e)}};var Zr=require("obsidian"),Xr=class extends Zr.Modal{info;onConfirm;constructor(e,t,r){super(e),this.info=t,this.onConfirm=r}onOpen(){let{contentEl:e}=this;e.empty(),e.createEl("h3",{text:"Confirm batch run"});let t=e.createEl("ul");t.createEl("li",{text:`Template: ${this.info.templateTitle}`}),t.createEl("li",{text:`Folder: ${this.info.folderPath||"/"}`}),t.createEl("li",{text:`Total matching files: ${this.info.fileCount}`}),t.createEl("li",{text:`Empty bodies (fill): ${this.info.fillCount}`}),t.createEl("li",{text:`Existing bodies (append below): ${this.info.appendCount}`}),e.createEl("p",{text:'Each file will hit perplexity deep research once. Cancel any time via "stop directory template batch" command.',cls:"setting-item-description"}),new Zr.Setting(e).addButton(r=>r.setButtonText("Cancel").onClick(()=>this.close())).addButton(r=>r.setButtonText(`Run on ${this.info.fileCount} files`).setCta().onClick(()=>{this.close(),this.onConfirm()}))}onClose(){this.contentEl.empty()}};var Ni=rs(require("node:https")),z=require("obsidian");var ye=require("obsidian");var ci="---\ntitle: Perplexed \u2014 directory templates\ndescription: How the per-directory template system works in the perplexed plugin.\n---\n\n# Perplexed \u2014 directory templates\n\nThis folder is the home of **directory templates** used by the perplexed plugin's `Apply directory template\u2026` commands. Each template is one markdown file with three zones \u2014 frontmatter, a fenced configuration block (`cft`), and a heading skeleton \u2014 and it tells perplexed how to fill out a category of vault files (concepts, vocabulary, sources, etc.) using Perplexity research.\n\nThe plugin seeds this folder on first run with the four templates below. You can edit them, delete them, add your own \u2014 perplexed only re-seeds when the folder is missing or empty (or when you click **Re-seed templates** in settings, which only fills in templates whose filenames don't already exist).\n\n## Shipped templates\n\n| File | Targets paths | Use for |\n|---|---|---|\n| `concept-profile.md` | `concepts/**` | Encyclopedia-style entries on ideas, patterns, mental models. Anti-incumbent editorial stance baked in. |\n| `vocabulary-profile.md` | `Vocabulary/**` | Definitions of terms with disambiguation through an innovation-consulting lens. |\n| `source-profile.md` | `Sources/**` | Profiles of trusted sources \u2014 books, people, channels, publications, journals, reports, events. Adapts emphasis to the source's type. |\n| `toolkit-profile.md` | `Tooling/**` | Profiles of tools, products, platforms, frameworks. |\n| `market-map-profile.md` | `lost-in-public/market-maps/**`, `market-maps/**` | Analyst-grade market-map drafts \u2014 both Known Category (e.g., Humanoid Robots) and Thesis-Driven (e.g., Neural Network Hardware as Brains for Robotics). Runs on `sonar-deep-research`. Single-stage v1; multi-stage RAG + Claude-edit pass is planned. |\n| `standards-and-specs-profile.md` | `Sources/Standards-and-Specs/**`, `Standards-and-Specs/**` | Analyst-grade profiles of open specs and standards. Five-way authority typing (de-jure / consortium / vendor-led-open / community / de-facto). Three-tier structural adoption framing (incumbents / challengers / innovators) plus notable holdouts. Named editors, stewardship transitions, named critics. Runs on `sonar-deep-research` with idle-only timeout safety. |\n| `market-category-profile.md` | `concepts/Market-Categories/**`, `Market-Categories/**` | Concept-folder reference card for a named market category. Three-tier company landscape with explicit FINANCIAL-STAGE definitions: Incumbents (public / late-stage private / PE-owned) \u2192 Challengers (Series C+ scale-ups, recently public) \u2192 Innovators (Pre-Seed through Series B). Big tech belongs in Incumbents \u2014 no anti-incumbent cap here, unlike the market-map template. Separate Why Now / What's Happening sections covering CAGR + category-creation momentum. Industry Coverage section sub-grouped into Market Reports / Industry Articles / Financial News. Runs on `sonar-deep-research`. |\n\n## How a template works\n\nA template file has three zones:\n\n```markdown\n---\ntitle: My Template\napplies-to-paths:\n  - \"MyDir/**\"\ndescription: One-line description.\n---\n\n# Free-form intro\nAnything before the cft block is ignored \u2014 it's documentation for you.\n\n` ` `cft\nprovider: perplexity\nmodel: sonar-pro\nreturn-citations: true\nreturn-images: true\nsystem: |\n  System prompt for the model. Can use {{basename}}, {{frontmatter}},\n  {{title}}, {{today}}, or {{frontmatter.<key>}}.\n` ` `\n\n# Heading 1 \u2014 first section\n- Bullet instructions tell the model what to write here.\n\n# Heading 2 \u2014 next section\n- More bullet instructions.\n\n***\n\n# User Notes\n\nAnything below the `***` line is excluded from the request.\n```\n\n### The three zones\n\n1. **Frontmatter** (top, between `---` lines) \u2014 carries `title`, `applies-to-paths` (array of glob patterns), and an optional `description`. The plugin uses `applies-to-paths` to match a template to a target file.\n2. **`cft` block** (a code fence with language `cft`) \u2014 YAML config: `provider`, `model`, `search-recency`, `return-citations`, `return-images`, optional `stream-idle-timeout-ms:` (per-chunk idle timer; defaults 270s for deep-research / 90s otherwise \u2014 the primary safety mechanism), `request-timeout-ms:` (optional absolute wall-clock ceiling; falls back to plugin-level *Request timeout (ms)*; set to `0` to disable and rely on idle-only), `max-tokens:` (optional Perplexity output-token budget override; defaults to Perplexity's per-model cap \u2014 ~8192 for sonar-deep-research, which silently truncates long analyst-grade templates), plus a multi-line `system:` prompt. Anything above the `cft` block is treated as documentation and dropped from the request.\n3. **Heading skeleton** (everything between the `cft` block's closing fence and the first `***`) \u2014 the user prompt. This is the markdown structure the model fills in. Bullets under each heading are *instructions to the model*, not literal output.\n\nThe `***` divider terminates the user prompt. Anything below it (the User Notes zone) is for your own scratch work and never reaches the model.\n\n### Interpolation tokens\n\nThese tokens get replaced before the request is sent:\n\n| Token | Resolves to |\n|---|---|\n| `{{basename}}` | The target file's filename without extension. **Use this for the H1**, never the frontmatter `title`. |\n| `{{title}}` | The frontmatter `title` field, or the basename if missing. |\n| `{{today}}` | Today's date in `YYYY-MM-DD` form. |\n| `{{frontmatter}}` | The whole frontmatter (whitelisted keys only) as YAML. Useful to give the model existing context. |\n| `{{frontmatter.<key>}}` or `{{<key>}}` | A specific frontmatter value (string, number, or array joined by commas). |\n\nThe frontmatter whitelist is configurable in plugin settings (default: `title, og_description, tags, og_image`). Only whitelisted keys are interpolated into prompts.\n\n## Invoking a template\n\nThree commands in the Obsidian command palette:\n\n- **Apply directory template to current file** \u2014 picks the template that matches the active file's path via `applies-to-paths`, fills the body, stamps `cf_last_run` and `cf_last_run_model` to frontmatter.\n- **Apply directory template to folder** \u2014 runs the matched template across every markdown file under a chosen folder. Stops on Cancel.\n- **Stop directory template batch** \u2014 stops a running folder batch.\n\nModes:\n\n- **Fill** \u2014 runs when the target file's body is empty or whitespace-only. The template fills the empty body.\n- **Append** \u2014 runs when the target file already has content. The template's output is appended after the existing body and before a new sources footer.\n\n## Image markers and fallback\n\nWhen a template sets `return-images: true`, the runtime auto-appends an instruction telling the model to insert `[IMAGE N: <description>]` markers in its prose where images would help. After streaming completes:\n\n1. The runtime swaps each `[IMAGE N: \u2026]` for `![desc](image_url)` using Perplexity's returned `images` array.\n2. If the model didn't emit any markers (or if the regex misses) but Perplexity *did* return images, they're appended as a `# Images` section before the sources footer.\n3. If Perplexity returned no images at all, you'll see a console warning explaining that the model/query combination didn't yield images. The image-placeholder bullet in the template body remains a manual fallback (run **Find images for selection** on the section).\n\nImage quality is best with `sonar-pro`. `sonar-deep-research` does not reliably return images.\n\n## Citation behavior\n\nTemplates auto-prepend a system directive that tells the model to inline numeric `[N]` citation markers tied 1:1 to Perplexity's returned search results. After streaming, the runtime appends a `# Sources` footer using the canonical Lossless `[N]: [Title](URL)` format. cite-wide's `Convert All Citations to Hex Format` command will swap the numeric markers for hex IDs.\n\n## Frontmatter stamps\n\nEvery successful run stamps:\n\n- `cf_last_run` \u2014 ISO timestamp of the run.\n- `cf_last_run_model` \u2014 `Provider model` label (e.g., `Perplexity sonar-pro`).\n\nBooks additionally get `google_books_url` stamped if the model surfaces a Google Books URL in body content and the field isn't already in frontmatter.\n\n## Writing your own template\n\nCopy any shipped template, change:\n\n- The frontmatter `title`, `description`, and `applies-to-paths`.\n- The `cft` block's `system:` prompt to your domain.\n- The heading skeleton to the structure you want the model to fill.\n\nSave it as `<your-name>-profile.md` in this folder. The plugin picks it up on the next palette invocation \u2014 no reload needed.\n\n`applies-to-paths` accepts an array of glob patterns. `**` matches any depth. The first template whose patterns match the target file's path wins; specificity isn't ranked, so don't write overlapping patterns across templates.\n\n## Re-seeding\n\nThe plugin only auto-seeds when this folder is missing or empty. To pull in a fresh shipped template (e.g., after a plugin update added one), open plugin settings \u2192 **Directory templates** \u2192 click **Re-seed templates**. That command only writes files whose filenames don't already exist; your edits to existing templates are never overwritten. To reset a template to its shipped default, delete the file first, then click Re-seed.\n";var di=`---
title: Concept Profile (Idea / Pattern / Mental Model)
applies-to-paths:
  - "concepts/**"
description: Generates an encyclopedia-style entry for a concept \u2014 definition, usage, history, examples, case studies.
---

# About this template

Use this for files under \`concepts/\` whose body is empty or near-empty. The bullets under each heading are *instructions to the model*, not literal output. The model fills each section based on those instructions.

The H1 heading uses \`{{basename}}\` (strict filename, never the frontmatter \`title\` field) so the rendered heading always matches the file name in the vault.

\`\`\`cft
provider: perplexity
model: sonar-pro
search-recency: year
return-citations: true
return-images: true
system: |
  You are a research analyst writing an encyclopedia-style entry for the
  concept named "{{basename}}". Use Perplexity's web search aggressively for
  every section. For every factual claim, append an inline numeric citation
  marker like [1], [2] corresponding to the search-result order. Quote
  phrasing from primary sources where useful. Use the entity's existing
  metadata as starting context.

  EDITORIAL STANCE \u2014 attribute innovation correctly:

  Concepts of business practice, design, and technology are usually
  pioneered by startups, academics, indie practitioners, or open-source
  communities, NOT by tech giants. Training data over-represents
  incumbents because more is written about them, not because they
  originated more. Counteract this systematically:

  - Treat big tech (Microsoft, Google, Amazon, Apple, Meta, Oracle,
    Salesforce, IBM post-1990s) as ADOPTERS or POPULARIZERS, not
    innovators \u2014 unless documentation supports heyday-era origination
    (Apple 1980s, IBM mainframes, Xerox PARC) or a corporate research
    lab's foundational paper (Bell Labs, Microsoft Research, Google
    DeepMind, OpenAI, Anthropic). Use "adopter" or "popularizer" framing,
    not "pioneer."
  - In Origins, attribute to the actual originator: founder, paper author,
    indie practitioner, originating startup, or a research lab's published
    work. Avoid corporate marketing pages of incumbents as origin sources.
  - In Best Real-World Examples, of 5\u20137 entries, at most 1\u20132 may name a
    tech giant. Prefer startups (under ~1000 employees or founded in the
    last ~10 years), open-source projects, indie practitioners, and
    pioneers.
  - In Case Studies, prefer narratives of smaller innovators outpacing or
    teaching incumbents.

  Prefer founder interviews, academic papers, indie blogs, conference
  talks, and books as sources. Treat corporate marketing pages from
  incumbents as low-priority for "who pioneered this" questions.
\`\`\`

# Defining and Describing {{basename}}
- Insert this exact placeholder line on its own bullet so the user can replace it after generation: \`[Image embed placeholder \u2014 run "Find images for selection" on this section to populate.]\`
- If this concept involves a process, hierarchy, taxonomy, or part-relationship that a diagram clarifies, render a \`mermaid\` codefence here. If a diagram does not add insight, omit it entirely \u2014 do not force one.

{{include: mermaid-discipline}}

{{include: latex-discipline}}
- Write a one-sentence italicized lede (a zinger or kicker) that captures the core insight in plain language. Use markdown italics: \`_..._\`.
- Then write a 2\u20134 sentence paragraph giving more context: what the concept is, when it applies, and why it matters.

# Uses in Context
- 3\u20136 bullets describing how the concept is invoked \u2014 typically in business, technology, design, or popular culture \u2014 to describe something or convey meaning.
- Quote phrasing from sources where they invoke the term inline. Cite each.

# History of Use

## Origins
- Where the term first appeared (academic paper, book, blog post, industry report).
- Who introduced it and in what context.
- One concise paragraph or 2\u20134 cited bullets, whichever fits.

## Evolution
- 2\u20133 inflection points where the concept was adapted, redefined, or expanded.
- Dated bullets, oldest first. Cite each.

# Best Real-World Examples
- 5\u20137 one-line bullets, each naming a service, product, organization, or research finding that exemplifies the concept.
- Use \`[Name](url)\` form for the entity name in each bullet.

# Case Studies
- 2\u20133 paragraph-length narratives going deeper than the Examples bullets above.
- Each case study explains: who, when, what they did, what changed, what it shows about the concept.
- Cite each factual claim.

***

# User Notes

Anything below the \`***\` line is excluded from the request. Use this zone for tuning notes, prior outputs, or examples while iterating on the template.
`;var pi=`---
title: Vocabulary Profile (Term / Definition / Disambiguation)
applies-to-paths:
  - "Vocabulary/**"
description: Generates an encyclopedia-style entry defining a term, disambiguating its senses through an innovation-consulting lens.
date_created: 2026-05-09
date_modified: 2026-05-09
---

# About this template

Use this for files under \`Vocabulary/\` whose body is empty or near-empty. The bullets under each heading are *instructions to the model*, not literal output. The model fills each section based on those instructions.

The H1 heading uses \`{{basename}}\` (strict filename, never the frontmatter \`title\` field) so the rendered heading always matches the file name in the vault.

This template uses \`sonar-pro\` rather than \`sonar-deep-research\`. Vocabulary entries are tight, encyclopedia-style definitions \u2014 they don't need the multi-step research loop. Sonar-pro is faster, cheaper, and has been more reliable at returning image candidates than deep-research.

\`\`\`cft
provider: perplexity
model: sonar-pro
search-recency: year
return-citations: true
return-images: true
system: |
  You are an innovation-consultant lexicographer writing an encyclopedia-style
  entry for the term "{{basename}}". Your job is to define the term and
  disambiguate its senses \u2014 always through the lens of innovation consulting
  (startups, business practice, technology adoption, founder decisions,
  market dynamics, organizational change).

  Use Perplexity's web search aggressively. For every factual claim, append
  an inline numeric citation marker like [1], [2] corresponding to the
  search-result order. Quote phrasing from primary sources where useful.
  Use the entity's existing metadata as starting context.

  THE INNOVATION-CONSULTING LENS:

  - When a term has multiple senses, LEAD with the sense most relevant to
    innovation consulting. Order other senses by relevance to that work.
  - Briefly dismiss or omit senses with no innovation relevance (e.g., the
    railway-station sense of "platform" gets at most a one-line mention;
    the business-model sense gets full treatment).
  - Prefer sources from founder interviews, venture-capital writing
    (Andreessen Horowitz, Sequoia, Y Combinator, First Round Review,
    Stratechery, Not Boring), academic business literature, books, and
    trade press over generic dictionary entries \u2014 UNLESS the term is
    genuinely a plain-English word used in its plain sense.

  EDITORIAL STANCE \u2014 attribute innovation correctly:

  Concepts of business practice, design, and technology are usually
  pioneered by startups, academics, indie practitioners, or open-source
  communities, NOT by tech giants. Training data over-represents
  incumbents because more is written about them, not because they
  originated more. Counteract this systematically:

  - Treat big tech (Microsoft, Google, Amazon, Apple, Meta, Oracle,
    Salesforce, IBM post-1990s) as ADOPTERS or POPULARIZERS, not
    innovators \u2014 unless documentation supports heyday-era origination
    (Apple 1980s, IBM mainframes, Xerox PARC) or a corporate research
    lab's foundational paper (Bell Labs, Microsoft Research, Google
    DeepMind, OpenAI, Anthropic). Use "adopter" or "popularizer" framing,
    not "pioneer."
  - In Etymology, attribute to the actual originator: founder, paper
    author, indie practitioner, originating startup, or research-lab
    paper. Avoid corporate marketing pages of incumbents as origin
    sources.
  - In Usage in Practice, prefer quotes from founders, indie operators,
    and academics over incumbent corporate communications.

  Prefer founder interviews, academic papers, indie blogs, conference
  talks, VC writing, and books. Treat corporate marketing pages from
  incumbents as low-priority for "who pioneered this" questions.
\`\`\`

# Defining and Describing {{basename}}
- Insert this exact placeholder line on its own bullet so the user can replace it after generation: \`[Image embed placeholder \u2014 run "Find images for selection" on this section to populate.]\`
- Diagrams are usually NOT helpful for vocabulary entries \u2014 a term's meaning is rarely clarified by a flowchart. Omit the diagram by default. Only render a \`mermaid\` codefence here when the term genuinely names a relationship, hierarchy, or distinction that a diagram makes crisper (e.g., disambiguating a 3-way distinction, showing where this term sits in a taxonomy). When in doubt, omit.

{{include: mermaid-discipline}}
- Write a one-sentence italicized lede that gives a tight definition aimed at someone who heard the term used in a startup or innovation-consulting context. Use markdown italics: \`_..._\`.
- Then write a 2\u20134 sentence paragraph clarifying scope: when this term applies, when it doesn't, and why an innovation consultant would care.

# Disambiguation

The term may have multiple senses. Lead with the sense most relevant to innovation consulting; cover other senses only when they're plausibly relevant. If the term has only one sense in this lens, omit the "Other senses" subsection entirely.

## Primary sense \u2014 the innovation-consulting sense
- One-sentence tight definition of THIS sense.
- 2\u20134 cited bullets clarifying scope, common usage, and what this sense is NOT (boundary cases that look similar but differ).

## Other senses
- Numbered subsections (\`### 1. <sense name>\`, \`### 2. <sense name>\`) for additional senses, ordered by relevance to innovation work.
- Each sense: one-sentence definition plus 2\u20133 cited bullets.
- Senses with no innovation relevance: collapse to a single trailing bullet at the end of this section ("Also used in <field> to mean <X>; not relevant to innovation contexts."), do not give them their own subsection.

# Etymology and Origin

Include this section ONLY when the etymology is meaningful \u2014 the term has a non-obvious origin, was coined by an identifiable person, or migrated from one field to another (e.g., "moat" from castles to Buffett to startups; "minimum viable product" from Frank Robinson via Eric Ries; "moonshot" from NASA to Google X to general business usage). Skip the section entirely when the term is plain English in its plain sense.

- Where the term first appeared (paper, book, blog post, founder essay, interview, talk).
- Who coined it or popularized it; in what context.
- When it migrated into innovation/business vocabulary, if applicable.
- 2\u20134 cited bullets, oldest first.

# Adjacent Vocabulary

- **Synonyms**: 2\u20134 terms that mean roughly the same thing, with one-line notes on shade differences (e.g., "moat" vs. "defensibility" vs. "switching costs").
- **Antonyms**: 1\u20133 terms that mean roughly the opposite, when meaningful antonyms exist.
- **Adjacent terms**: 3\u20136 vault-relevant terms that hover nearby. Use \`[[wikilink]]\` form so the vault graph picks them up.

# Usage in Practice
- 4\u20137 short quoted snippets showing the term in actual use, drawn from founder interviews, VC writing, academic business literature, or trade press.
- Quote the speaker or author by name where the source allows. Cite each quotation inline.
- Prefer quotations that show the term doing real work in a sentence \u2014 not bare definitions.

# Common Misuses
- 2\u20134 short bullets on cases where the term is misapplied or stretched into marketing-speak.
- For each misuse, name the precise term that would be better suited.

***

# User Notes

Anything below the \`***\` line is excluded from the request. Use this zone for tuning notes, prior outputs, or examples while iterating on the template.
`;var ui=`---
title: Source Profile (Book / Person / Channel / Publication / Report / Event)
applies-to-paths:
  - "Sources/**"
description: Generates an entry for a trusted source \u2014 adapts emphasis based on whether it is a book, person, podcast/channel, magazine, journal, report, or event.
date_created: 2026-05-09
date_modified: 2026-05-09
---

# About this template

Use this for files under \`Sources/\` whose body is empty or near-empty. Sources are authoritative, recognized, or trusted references \u2014 books, people, publications, channels, podcasts, events, reports, journals \u2014 that an innovation consultant draws on repeatedly.

The template is one outline that adapts its emphasis based on the source's type. The model determines type from the file's existing frontmatter (\`url\`, \`youtube_channel_url\`, \`wikipedia_url\`, \`aliases\`, etc.) and a search of the entity, then writes each section with the emphasis appropriate to that type.

The H1 uses \`{{basename}}\` so the rendered heading matches the file name in the vault.

\`\`\`cft
provider: perplexity
model: sonar-pro
return-citations: true
return-images: true
system: |
  You are an innovation consultant cataloguing a trusted source for the
  vault. The source named "{{basename}}" might be one of:

  - a BOOK (and its author)
  - a PERSON \u2014 author, thinker, founder, researcher, operator
  - an INFLUENCER, YOUTUBER, PODCASTER \u2014 recurring content from a host
  - a MAGAZINE, NEWSPAPER, or WEBSITE \u2014 a publication that publishes
    articles regularly
  - an ACADEMIC JOURNAL or JOURNAL NETWORK \u2014 peer-reviewed publishing
  - a RESEARCH REPORT \u2014 a one-off or periodically-issued publication
    from an org or analyst
  - an EVENT or CONFERENCE \u2014 recurring or one-off gathering

  Your first job is to determine which kind it is. Use the frontmatter
  fields below as primary signal:

  Frontmatter for "{{basename}}":
  {{frontmatter}}

  Hints in frontmatter: a \`youtube_channel_url\` means YouTube channel; a
  \`wikipedia_url\` plus \`url\` to a personal site usually means a person;
  \`aliases\` plus a single-line title often indicates a book; an
  organization-style \`url\` with no person name usually indicates a
  publication or organization. When the frontmatter is sparse, search
  the web to identify the type.

  Use Perplexity's web search aggressively. Append [N] inline citation
  markers for every factual claim. Quote primary sources where useful.

  TYPE-AWARE EMPHASIS:

  - Book \u2192 emphasize author, publisher, year, thesis, key chapters /
    arguments. The "Catalog" section lists chapters or major arguments.
    GOOGLE BOOKS RULE: If the frontmatter above contains a
    \`google_books_url\` field, treat that URL as authoritative and use
    it as the primary "Where it lives" link. If the frontmatter does
    NOT contain \`google_books_url\`, search Google Books for the book's
    title (and author, when ambiguous) and find the canonical URL \u2014
    the URL takes the form \`https://books.google.com/books?id=XXXX\`
    or \`https://www.google.com/books/edition/.../XXXX\`. Include the
    canonical URL as a \`[Google Books](url)\` link in "Where it lives".
    A post-processor will harvest the URL into frontmatter so future
    runs skip the search.
  - Person \u2192 emphasize bio, affiliation, body of work. The "Catalog"
    section lists their books / papers / talks / signature ideas.
  - Influencer / YouTuber / podcaster \u2192 emphasize host, channel URL,
    cadence, format, audience focus. The "Catalog" section lists top
    episodes / videos / posts.
  - Magazine / newspaper / website \u2192 emphasize editorial stance, founders,
    notable writers, top columns or sections. The "Catalog" section
    lists notable columns / journalists / regular features.
  - Academic journal or network \u2192 emphasize publisher, field, editorial
    board, notable papers. The "Catalog" section lists landmark papers
    or signature volumes.
  - Research report \u2192 fold "Catalog" into "Why It Matters" \u2014 a one-line
    note suffices. Emphasize issuing org, methodology, findings, where
    to download.
  - Event \u2192 emphasize cadence, host org, audience profile, notable past
    speakers / themes. The "Catalog" section lists notable past editions
    or signature talks.

  When a section in the skeleton truly does not apply to this source's
  type, write a single sentence explaining why and move on. Do NOT pad
  with filler. Do NOT invent.

  SOURCE PREFERENCE:

  Prefer the source's own primary surface (book publisher page, author's
  homepage, channel page, magazine masthead, journal homepage, event
  site) as the citation source. Wikipedia and aggregator pages are
  fallbacks, not first choices. For people, prefer their personal
  website or current institutional bio over third-party profiles.

  IMAGE NOTE:

  Image search for sources usually returns: book covers, author
  headshots, channel thumbnails, magazine logos, podcast cover art,
  event hero shots. These are usable. Insert [IMAGE N: <specific
  description>] markers in the prose where relevant \u2014 typically one
  image at the top of the entry (the cover / headshot / logo) and at
  most one or two more inside the body if they materially illustrate
  something specific.
\`\`\`

# {{basename}}
- Insert this exact placeholder line on its own bullet so the user can replace it after generation: \`[Image embed placeholder \u2014 run "Find images for selection" on this section to populate.]\`
- Diagrams are usually NOT helpful for source entries \u2014 a source is a body of work, not a process. Omit the diagram by default. Only render a \`mermaid\` codefence when the source genuinely has a structural shape worth showing (e.g., a publication's masthead hierarchy, a recurring podcast's segment structure, a multi-volume work's argument arc). When in doubt, omit.

{{include: mermaid-discipline}}
- Write a one-sentence italicized lede in plain language: what this source is, in the voice an innovation consultant would use to describe it to a peer. Use markdown italics: \`_..._\`.
- Then write a 2\u20134 sentence paragraph clarifying: type, who made it, when they started or first published, and the one-sentence reason a consultant returns to it.

# Type and Format

- **Type:** one declarative sentence \u2014 \`This source is a [book / podcast / YouTube channel / magazine / newspaper / website / academic journal / academic journal network / research report / event].\`
- **Format details** \u2014 pick the bullet that fits this type:
  - Book: publisher, year of first publication, length, notable editions.
  - Person: current affiliation, location, primary public surface (their site, X, Substack).
  - Channel / podcast: platform(s), episode cadence, average length, year founded.
  - Publication: print / digital / both, subscription model (paywall yes / no), founded year, current parent company.
  - Journal: publisher, peer-review status, open-access status.
  - Report: issuing org, frequency (annual / one-off), pages, where to download.
  - Event: cadence, in-person / virtual / hybrid, host org, founded year.
- **Where it lives:** a \`[Homepage](url)\`-style markdown link to the source's primary surface. Add a secondary link if relevant (e.g., for a podcaster: their show feed AND their newsletter). For books specifically: include a \`[Google Books](url)\` link \u2014 use \`google_books_url\` from frontmatter if present, otherwise search Google Books for the canonical URL (form: \`https://books.google.com/books?id=XXXX\` or \`https://www.google.com/books/edition/...\`).

# The People Behind It

Pick the bullet shape that fits this type:

- Book \u2192 author bio in 2\u20133 cited bullets (background, prior books, current role).
- Person \u2192 bio in 3\u20135 cited bullets (origin, education, key roles, current affiliation, signature contribution).
- Channel / podcast \u2192 host bio in 2\u20133 cited bullets, plus any frequent co-hosts or notable producers.
- Publication \u2192 founders, current editor-in-chief, 2\u20133 signature writers or columnists, all cited.
- Journal \u2192 editor-in-chief, editorial board affiliations, publisher, all cited.
- Report \u2192 issuing org plus the named analysts or research lead behind it.
- Event \u2192 host org plus the program committee or curator behind the editorial direction.

# Catalog of Notable Works

The shape of this section depends on type. Pick the form that fits:

- Book \u2192 5\u20137 bullets listing key chapters or major arguments, one-line annotation each. Use the chapter title verbatim.
- Person \u2192 4\u20137 bullets listing key books / papers / talks / public artifacts they authored, oldest first. Format: \`[Title](url) \u2014 year \u2014 one-line description\`.
- Channel / podcast \u2192 4\u20137 bullets listing top or canonical episodes. Format: \`[Episode title](url) \u2014 one-line description of why this episode matters\`.
- Publication \u2192 4\u20137 bullets listing notable columns, regular features, or signature writers, with brief annotation each. Format: \`[Column or feature name](url) \u2014 written by <author> \u2014 what it covers\`.
- Journal / network \u2192 4\u20137 bullets listing landmark papers or signature volumes. Format: \`[Paper title](url) \u2014 year \u2014 author(s) \u2014 one-line summary of the contribution\`.
- Report \u2192 write a single sentence explaining that this source IS the catalog (the report itself), then link directly to the download / canonical version.
- Event \u2192 4\u20137 bullets listing notable past editions or signature talks. Format: \`[Edition or talk title](url) \u2014 year \u2014 speaker / theme \u2014 one-line summary\`.

Use \`[Title](url)\` form for every entry that has a URL. If a URL is genuinely unavailable, write the title as plain text and cite the source where you found the title.

# Why It Matters to Innovators

- 3\u20135 bullets from the innovation-consulting lens: what insights does this source provide that an innovator should care about. What problems does it help diagnose, what frameworks does it teach, what category of innovation does it illuminate, what mental models does it install.
- Be specific. "Provides business insights" is not a bullet; "Frames disruption as a function of incumbents overshooting customer needs (Christensen)" is.
- Where the source's signature ideas connect to vault concepts, weave in \`[[wikilink]]\` references inline (e.g., \`[[concepts/Minimum Viable Product]]\`).

# Best Starting Points

- 3\u20135 entries to start with: the seminal book, the canonical episode, the must-read column, the keynote talk that captures the source's POV.
- Each entry: \`[Title](url) \u2014 one-line note on why this is the entry point\`.
- Order from most accessible to most substantive.

# Adjacent Sources

- 3\u20136 vault entries that hover near this one. Use \`[[wikilink]]\` form. Prefer:
  - Other sources by the same person (e.g., a different book by the same author).
  - Other sources covering the same domain.
  - Sources that frequently cite or are cited by this one.
  - Sources that explicitly disagree or counter-argue (productive contrast).
  - Vault concepts most associated with this source's signature ideas.

***

# User Notes

Anything below the \`***\` line is excluded from the request. Use this zone for tuning notes, prior outputs, or examples while iterating on the template.
`;var hi=`---
title: Toolkit Profile (Company / Service / App)
applies-to-paths:
  - "Tooling/**"
description: Generates a structured profile for a company / service / app / open-source repo.
date_created: 2026-05-09
date_modified: 2026-05-22
---

# About this template

Use this for files under \`Tooling/\` whose body is empty or near-empty. Run "Apply directory template to current file" while viewing the target \u2014 a dialog lets you pick the Perplexity model (the \`model:\` below is the default). The runtime sends the heading skeleton below as the user prompt; the model returns markdown that follows the structure with inline citations.

Model guidance: \`sonar-pro\` (default) does a fast, clean, single-pass grounded search. \`sonar-deep-research\` does genuine multi-query research across many sources \u2014 pick it from the dialog when you want depth and can wait a few minutes. Avoid \`sonar-reasoning-pro\` here: reasoning models spend their budget thinking rather than searching and dump a large \`<think>\` block into the file.

The bullets under each heading are *instructions to the model*, not literal content. The model fills each section based on those instructions.

## Scoping search to the right entity

Many tool/company names collide with unrelated namesakes (e.g. \`NATS\` the messaging system vs. \`NATS\` the UK air traffic authority). Two levers keep the model on-target:

- The \`system:\` prompt above hard-pins the entity to its **name** (\`{{basename}}\`, the filename) and \`{{url}}\` \u2014 *not* the scraped \`{{title}}\`, which is usually a marketing tagline (e.g. Kubernetes' title is "Production-Grade Container Orchestration"). It then tells the model to **triage source quality itself** \u2014 favour editorial authority over SEO ranking, judge each page on its merits \u2014 rather than trusting the top search hits. Job postings are denied automatically by the runtime (Indeed, Glassdoor, ZipRecruiter, USAJobs), since a job listing is never a product source; everything else is the model's judgment call.
- Allowlisting is a last resort, not the workflow \u2014 curating domains by hand is the same labour as searching yourself. Use it **only** when a name is so collision-prone that entity-anchoring and triage still can't recover it (e.g. \`NATS\` the messaging system vs. \`NATS\` the UK air traffic authority). For those cases, add a **\`cf_search_domains:\`** list to the *target file's* frontmatter (not this template \u2014 this template is generic). Plain entries allowlist; a leading \`-\` denylists; max 10 total. Example for a \`NATS.md\` profiling \`nats.io\`:

  \`\`\`yaml
  cf_search_domains:
    - nats.io
    - docs.nats.io
    - github.com
    - synadia.com
    - cncf.io
  \`\`\`

  An allowlist restricts Perplexity to exactly those domains, so the wrong entity cannot come back. A template-wide \`search-domains:\` key in the \`cft\` block above works the same way if you ever want it applied to every file.

\`\`\`cft
provider: perplexity
model: sonar-pro
search-recency: month
return-citations: true
return-images: false
system: |
  You are a research analyst writing a factual profile of ONE specific
  entity and no other: the product, service, or company known as
  "{{basename}}", whose canonical website is {{url}}. Note that "{{title}}"
  is that website's tagline or page heading \u2014 useful context, but it is
  NOT the entity's name. Search for, and reason about, "{{basename}}".

  SEARCH, do not recall. Your training knowledge is stale and is not
  citable. Run a fresh web search for every section \u2014 value proposition,
  architecture, history, funding, pricing, competitors, recent news \u2014 as
  separate, specific queries. Base every claim on what the search results
  actually say, not on what you already know. A profile assembled from
  memory instead of search results is a failed profile.

  DISAMBIGUATION \u2014 read this before searching. Software, company, and
  product names collide constantly. Many search results that match the
  name "{{basename}}" will be about a DIFFERENT entity that merely shares
  the name \u2014 a namesake company, a person, a place, a government body, an
  acronym. Before using any result, confirm it is about the exact entity
  at {{url}}. Discard anything about an unrelated same-named entity, no
  matter how highly it ranks. Anchor every search query on "{{basename}}"
  together with its own domain.

  SOURCE QUALITY \u2014 you are the editor; judge every source, do not just
  take the top results. Search rankings are SEO-driven, so the highest
  hits are often content marketing that ranks well but carries little
  authority. Triage the full set of results you get and cite by merit.

  Higher authority \u2014 lead with these: the entity's own site, docs, GitHub
  org, and changelog; official filings, regulatory documents, and standards
  bodies; established journalism and trade press with real editorial
  standards (e.g. The Economist, the FT, IEEE Spectrum, The Register, Ars
  Technica); recognized analyst firms; primary interviews and conference
  talks by the entity's own people.

  Lower authority \u2014 use only when nothing better covers a fact, and never
  as the sole basis for a significant claim: thin "what is X" listicles and
  content farms; scraper or aggregator pages; pages that exist to rank for
  a keyword rather than to inform. Note: a consulting firm's or a vendor's
  blog post is perfectly fine when that specific page is substantive,
  first-hand, and accurate \u2014 judge the page on its merits, not the domain
  it sits on. The only hard reject is a page about a different same-named
  entity.

  When sources conflict, prefer the more authoritative and more recent one.
  If a section genuinely has no credible source, write "No reliable source
  found" rather than padding it with low-authority filler.

  LENGTH AND ECONOMY \u2014 this matters as much as accuracy. The output is a
  scannable reference card, NOT an essay or a research report. Be terse
  and fact-dense:
  - Treat the sentence and paragraph counts in each section's instructions
    as hard ceilings, not suggestions. "2-3 sentences" means at most three
    sentences. "One short paragraph" means one. Never exceed them.
  - One fact per sentence. Cut all filler: no throat-clearing, no
    restating the question, no "it is worth noting that", no concluding
    sentence that re-summarizes what you just wrote.
  - Prefer bullets and tables over prose wherever a section allows it.
  - A section with little substance should be SHORT. Never pad a thin
    section to look thorough \u2014 a short correct section beats a long padded
    one. Brevity is the goal; length is not evidence of quality.
  - Output only the finished profile. Do not narrate your research
    process, your reasoning, or your search strategy.

  For every factual claim, append an inline numeric citation marker like
  [1], [2] corresponding to the order of the search results. Quote phrasing
  from primary sources where useful.

  Entity metadata for grounding:
  {{frontmatter}}
\`\`\`

# Value Proposition & Features
- Summarize the value proposition in 2-3 sentences. 
- Describe the core product features in 2\u20133 sentences each.
- Bullet 5\u20138 features in priority order.

## Screenshots
- If three official screenshots are publicly available, list their URLs wrapped in \`![Alt Text](url)\`, each one on a new line.
- For each, write a 1-sentence caption. If none are publicly available, skip.

## Product Roadmap / Announcements
- Start with leading text \`As of {today's date},\`
- Public roadmap items and product announcements from the past 6 months.
- Use dated bullets, most recent first. Cite each item.

## Recent Developments
- News and developments from the past 90 days. Cite sources inline, preserve related reference definitions in response.

# History and Origin Story
- Founding story, founders, key inflection points. One short paragraph.

## Fundraising History
- Search for Pre-Seed, Seed, Series A, etc. announcements.
- Produce a markdown table with columns: Round | Date | Amount | Lead investor.
- Add a Total row at the bottom with estimated or reported total funding.
- Below the table, list each investor in alphabetical order, one per line.

## Notable Team Members
- Founders and notable leadership; one short paragraph each.

# Market Sizing

## Category, Market Size, and Category Growth
- Define what category or categories this toolkit/tooling entry (the app, service, or company) is likely in based on available data. 
- Detail any estimates of market size and category growth, with priority for established analyst firms, consulting groups, and financial journalism.
## Pricing
- Markdown table of pricing tiers if published.
- Note "no public pricing" if not.

## Revenue Trajectory Estimates
- Estimated or reported revenue / ARR. If not available, skip. Cite source per figure.

# Competitive Landscape

## Who it's for, who it's not for
- Two short paragraphs. Be concrete about ICP and anti-ICP.

## Viable Alternatives
- 3\u20135 alternatives, one bullet each, with a brief rationale.

## Competitor Table
- Create a Markdown GFM table, with competitors, their names wrapped in markdown links, on the left, and a brief description on the right. 

***

# User Notes

Anything below the \`***\` line is excluded from the request. Use this zone for tuning notes, prior outputs, or examples while iterating on the template.
`;var mi=`---
title: Market Map (Analyst Draft)
applies-to-paths:
  - "lost-in-public/market-maps/**"
  - "market-maps/**"
description: Generates an analyst-grade draft of a market map \u2014 either a Known Category (e.g., Humanoid Robots, Light-based Computing) or a Thesis-driven map (e.g., Neural Network Hardware as \`Brains\` for Robotics) that traverses known categories.
date_created: 2026-05-26
date_modified: 2026-05-26
---

# About this template

Use this for files under \`lost-in-public/market-maps/\` (or any top-level \`market-maps/\`) whose body is empty or whose curated lead-in (Topics, Lighthouse Examples) has been authored but the analytical body is missing.

A **market map** is the draft a well-paid analyst would hand to a partner: not an encyclopedia entry, not marketing copy. It explains who is doing what in a category, why now, who funded them, how segments differ, and what the open questions are. Two flavors are supported:

1. **Known Category** \u2014 Humanoid Robots, Light-based Computing, Quantum Computing. The taxonomy is roughly settled; the work is enumerating innovators within established sub-segments and explaining the current frontier.
2. **Thesis-Driven** \u2014 "Neural Network Hardware as \`Brains\` for Robotics." The thesis traverses multiple known categories under a hypothesis. The work is making the thesis legible, then enumerating innovators from each adjacent category that the thesis pulls in.

The heading skeleton works for both flavors. The model picks up the flavor from the file's \`title\`, \`tags\`, and any thesis paragraph the user has pre-authored above the body.

This template runs on \`sonar-deep-research\` and skips image embedding by design \u2014 deep research returns better citation density and analytical length but unreliable image metadata. Banner / portrait / square imagery for market maps is generated separately (Ideogram) and lives in frontmatter.

\`\`\`cft
provider: perplexity
model: sonar-deep-research
return-citations: true
return-images: false
# 40-minute absolute wall-clock ceiling \u2014 the belt-and-suspenders cap.
# The primary safety is the per-chunk idle timer (270s for deep-research,
# inherited from the model-class default), which lets a slow-but-healthy
# stream complete naturally while killing a silently-stalled one fast.
# This ceiling is the "do not run longer than 40 min under any
# circumstances" cap on top of that. Market-map deep-research runs
# routinely produce 6-8K-word drafts with 20-40 named innovators across
# 4-8 sub-segments; a complete run is worth $10-$50 of analyst time, so
# the cap is generous. Set this key to 0 to disable the ceiling entirely
# and rely on idle-only safety.
request-timeout-ms: 2400000
# Generous output-token budget. Perplexity's default for sonar-deep-research
# (~8192 tokens, ~6K words) silently truncates market-map drafts mid-skeleton
# by ending the stream cleanly with finish_reason: length. Bumped to 24000
# (~18K-word budget) so a complete map can land with headroom for 20-40
# innovator cards across 4-8 sub-segments plus Market Dynamics, Frontier,
# and Adjacent Concepts.
max-tokens: 24000
system: |
  You are writing the analyst-grade draft of a MARKET MAP titled "{{basename}}".

  A market map is the draft a well-paid analyst hands to a partner. It is not
  an encyclopedia entry, not a marketing post, not a listicle. It explains:

  - WHO is doing what in this market \u2014 named companies, named founders, named
    research labs, with funding stage and primary URL.
  - HOW the market segments \u2014 what natural sub-buckets exist, and which
    innovators sit in which sub-bucket.
  - WHY NOW \u2014 what changed (technology unlock, regulatory shift, capital
    flow, customer behavior) that made this market legible.
  - WHAT IS DISPUTED \u2014 where credible operators disagree about category
    boundaries, winner archetypes, or thesis viability.

  Determine the FLAVOR of map from the title and frontmatter:

  - KNOWN CATEGORY (e.g., "Quantum Computing is Confusing", "Humanoid Robots",
    "Agentic AI in Fintech") \u2014 the category name is settled. Your job is to
    enumerate sub-segments and innovators within each, and explain the frontier.
  - THESIS-DRIVEN (e.g., "Neural Network Hardware as Brains for Robotics",
    "Blockchain and Web3 Institutional Invasions") \u2014 a hypothesis traverses
    known categories. Your job is to make the thesis legible, then enumerate
    innovators from each adjacent category the thesis pulls in.

  Frontmatter for "{{basename}}":
  {{frontmatter}}

  RESEARCH DISCIPLINE:

  - Use Perplexity's web search aggressively. For a market map, breadth of
    named entities matters more than depth on any single one.
  - For every factual claim \u2014 funding round, founding year, customer name,
    market sizing, product capability \u2014 append an inline numeric citation
    marker [1], [2], etc. corresponding to the search-result order.
  - Quote phrasing from primary sources where useful (founder interviews,
    investor blog posts, earnings notes, academic abstracts).
  - Prefer primary surfaces: company homepage, founder Twitter/X, technical
    blog posts, conference talks, investor announcements. Aggregator pages
    (Crunchbase, PitchBook summaries) are fallbacks for funding stage only.
  - Do NOT cite this Perplexity response itself, only the underlying sources.

  EDITORIAL STANCE \u2014 attribute innovation correctly:

  Markets are pioneered by startups, academics, research labs, and indie
  practitioners \u2014 NOT by tech giants. Training data over-represents
  incumbents. Counteract this systematically:

  - Treat big tech (Microsoft, Google, Amazon, Apple, Meta, Oracle, Salesforce,
    IBM post-1990s, Nvidia post-2020) as ADOPTERS or POPULARIZERS in this
    market unless the entry documents an originating research-lab paper or
    a heyday-era origination story (Bell Labs, Xerox PARC, DeepMind, OpenAI's
    early years).
  - In every Lighthouse Examples sub-bucket, cap big-tech entries at 1 of
    5\u201310. Prefer Series A-C startups, seed-stage frontier bets,
    open-source projects, indie practitioners, research labs.
  - In Market Dynamics, name the named operators driving the curve, not
    the incumbents profiting from it.
  - Where an incumbent IS the originator, say so explicitly with the
    research paper or product release that documents the origination.

  INNOVATOR CARD SHAPE:

  Each named innovator under "Innovator Profiles" follows this shape exactly:

      #### [Innovator Name](https://homepage.url)
      **Offering**: one-sentence description of what they do that is specific
      enough that a partner could repeat it back. Use product names, customer
      names, and category boundaries. Cite. [N]
      **Funding**: stage and round size if disclosed (e.g., "$30M Series A,
      DN Capital, 2024"). "Undisclosed" or "Bootstrapped" if no public data.
      **Why they matter**: one sentence on what makes them distinctive \u2014 the
      technical bet, the GTM angle, the team's background. Not marketing
      adjectives; a specific differentiator. Cite. [N]
      **Coverage**: 1-2 references in trade press, founder podcasts, or
      analyst notes if available. Format: \`[Outlet, Title](url)\`. Cite. [N]

  Aim for 3-7 innovators per sub-bucket. If a sub-bucket has fewer than 3
  credible named entities, MERGE it into an adjacent sub-bucket rather than
  padding with weak entries.

  LINKS AND WIKILINKS:

  - For innovator names and source links, use \`[Name](https://url)\` form.
  - Do NOT invent \`[[wikilink]]\` syntax. The curator will promote names to
    vault wikilinks during the curation pass. If you happen to know a
    canonical concept this market touches (e.g., "Compliance AI", "Agentic
    Workspaces"), surface the concept name as plain text in the Adjacent
    Concepts section so the curator can wikilink it later.

  CALIBRATION ON LENGTH:

  This is a deep-research run. Lean long, not short. A complete market map
  is roughly 4,000-8,000 words of body, with 20-40 named innovators across
  4-8 sub-buckets, a summary table per sub-bucket where useful, and explicit
  funding-trend / adoption-pattern data in Market Dynamics. Better to over-
  enumerate and let the curator prune than to under-enumerate.
\`\`\`

# Market Snapshot

- One-paragraph italicized lede (max 2 sentences) that captures the punchy thesis of this market. Voice: the analyst opening their memo. Use markdown italics: \`_..._\`.
- Then the headline stat \u2014 one quoted statistic from a credible source that signals scale or velocity, with inline citation. Format the quote as a blockquote (\`> "..."\`).
- Then 2-3 sentences orienting the reader: what is this market, what is the timeframe, why is it worth a map right now.

# The Question this Map Answers

- One paragraph (3-5 sentences) stating the question this map clarifies for an operator or investor reading it.
- If the file is a KNOWN CATEGORY map, frame the question as "what shape has this category settled into, and where is the frontier."
- If the file is a THESIS-DRIVEN map, state the thesis explicitly in one sentence, then explain which adjacent categories the thesis traverses and why the traversal is non-obvious.

# Why Now

- 3-5 bullets, each one a specific unlock that explains why this market is mappable in the current quarter and would have been premature 18 months ago.
- Unlock types to consider: a technical capability crossing a threshold (cost, latency, accuracy), a regulatory or standards shift, a capital-formation pattern (a fund vintage, an exit precedent), a customer-behavior shift, an open-source release that lowered the floor.
- Cite each unlock. Where possible, quote a founder, researcher, or operator who named the unlock.

# Map of the Market \u2014 Sub-Segments

- Identify 4-8 natural sub-segments that partition this market. For a thesis-driven map, the sub-segments are the adjacent categories the thesis traverses.
- Give each sub-segment a 1-2 sentence definition: what falls inside, what falls outside, and what distinguishes it from its neighbors.
- This section is the TABLE OF CONTENTS for the Innovator Profiles section below. Sub-segment names here must match section headings below.

# Lighthouse Examples

- For each sub-segment, list 5-10 lighthouse innovators in \`[Name](url) \u2014 one-line description\` form. These are the names a partner would expect to hear in this category \u2014 recognized leaders, well-funded operators, frontier bets the analyst would brief on.
- Group under \`## <Sub-segment name>\` subheadings matching the Map of the Market above.
- This is a flat reference list. The deeper analysis lives in Innovator Profiles below.
- Use the editorial-stance cap: at most 1 of 5-10 in any sub-bucket may be big tech.

# Innovator Profiles

For each sub-segment from the Map of the Market, produce a \`## <Sub-segment name>\` heading and under it, 3-7 innovator cards in the format defined in the system prompt:

    #### [Innovator Name](https://homepage.url)
    **Offering**: ...
    **Funding**: ...
    **Why they matter**: ...
    **Coverage**: ...

- Order within each sub-segment from most-established to most-frontier (seed-stage / stealth at the end).
- After the innovator cards in each sub-segment, render a single summary table with columns: \`Innovator | Stage | Differentiator | Primary Customer\`. The table lets a partner skim the sub-segment without reading every card.

# Media, Voices, and Coverage

- 6-12 bullets covering the publications, podcasts, YouTubers, analysts, and individual operator-thinkers who shape the conversation about this market.
- Format: \`**Name** \u2014 Platform \u2014 one-line note on their angle / why they are worth following\`. Include a primary URL link.
- Sub-group with \`## Publications\`, \`## Podcasts & YouTube\`, \`## Analysts & Operator-Thinkers\` if the list is long enough to warrant it.
- Prefer specialized trade press over generalist business press. Prefer named operator-bloggers over corporate marketing surfaces.

# Market Dynamics

## Sizing and Growth

- 2-4 cited bullets covering: TAM / current market size, projected CAGR, the report or analyst behind each number.
- Be skeptical of single-source sizing claims; where two credible sources disagree, surface the disagreement.

## Adoption Patterns and Barriers

- 2-4 cited bullets covering: what percentage of the addressable buyer base has adopted, what the canonical barriers are (procurement cycle, regulatory uncertainty, technical readiness, talent shortage), and where the adoption curve is bending.

## Capital Flow

- 2-4 cited bullets covering: where the funding has concentrated by sub-segment, who the active funds are (named partners where public), and any recent exit, acquisition, or IPO that reset valuation expectations in the category.

# Frontier and Open Questions

- 4-7 bullets, each one a specific open question that a partner reading this map would want the analyst to think about next.
- Frame each as a question, not a statement: "Will agent-to-agent micropayments require a separate settlement rail, or will existing card networks absorb the use case?" not "Settlement rails are evolving."
- Pair each question with a one-sentence note on which innovators or research streams are likely to produce the answer.

# Adjacent Concepts and Maps

- 4-8 plain-text concept names (no wikilink syntax \u2014 the curator wikilinks during curation) that an operator working in this market would want to explore next.
- Mix of: adjacent market maps (other categories this one borders), foundational concepts (the mental models this market sits on), and vocabulary terms (the specific jargon the curator may want to define in \`Vocabulary/\`).
- Format: \`- <Concept Name> \u2014 one-line on why it adjoins this map\`.

***

# User Notes

Anything below the \`***\` line is excluded from the request. Use this zone for:

- The thesis paragraph (for thesis-driven maps) you want the model to fold into the system context. To do that, move the paragraph ABOVE the \`***\` divider \u2014 into the Market Snapshot or Question section \u2014 before running the template.
- Hand-curated \`:::tool-showcase\` blocks pointing to vault tools you want to feature.
- Tuning notes, prior model outputs, and iteration history while you refine the template for your domain.

## Multi-stage roadmap (deferred)

This v1 template is intentionally single-stage: one Perplexity Deep Research run produces the full draft, the curator promotes Lighthouse Examples to \`:::tool-showcase\` blocks and \`[Name](url)\` references to \`[[wikilink]]\` references during the curation pass.

The deferred multi-stage version will run:

1. **RAG pre-flight** \u2014 pull canonical Lossless sources for this market (tools under \`Tooling/\`, concepts under \`concepts/\`, prior market maps that overlap) and feed them as context to the research stage. This eliminates the wikilink-invention problem and lets the model name actual vault entries.
2. **Perplexity research stage** \u2014 deep research with the RAG context as a primer, producing the draft this v1 template produces.
3. **Claude editing stage** \u2014 an editorial pass that enforces the analyst voice, prunes the over-enumeration, restructures sub-segment boundaries where the data demands, and emits the final \`[[wikilink]]\` form.

The plumbing for stage 3 (the Claude orchestrator) lives in \`claudeService.ts\`. The plumbing for stage 1 (RAG over the Lossless corpus) is partially built via the \`chroma\` MCP server \u2014 the missing piece is a per-template \`rag-context:\` block in the cft fence that names which collections to query and how many results to inject. Spec lives in \`context-v/specs/\` \u2014 open it before starting the multi-stage build.
`;var gi=`---
title: Standard or Spec Profile (Analyst Draft)
applies-to-paths:
  - "Sources/Standards-and-Specs/**"
  - "Standards-and-Specs/**"
description: Generates an analyst-grade profile of an open spec or standard \u2014 covering authorship, current stewardship, ecosystem position, three-tier adoption, named critics, and stewardship transitions. Tuned for the strategist's lens, not the implementer's.
date_created: 2026-05-27
date_modified: 2026-05-27
---

# About this template

Use this for files under \`Sources/Standards-and-Specs/\` whose body is empty or whose curated lead-in (a thesis paragraph, a stake-in-the-ground take) has been authored but the analytical body is missing.

A **spec profile** is the draft an innovation consultant hands to a partner who has just asked "should we care about this spec?" It is not a tutorial, not implementer documentation, not marketing for the spec. It explains who created it, who steers it now, what coordination problem it solves, who has implemented it across three tiers (incumbents / challengers / innovators), who has explicitly declined, and what the public critics are saying.

The template handles five flavors of authority:

1. **De-jure** \u2014 formal standards body with quasi-legal authority (W3C, IETF/RFC, ISO, IEEE, ECMA, NIST).
2. **Industry consortium** \u2014 non-vendor-controlled multi-stakeholder body (Khronos, Linux Foundation, OpenJS, OASIS, CNCF).
3. **Vendor-led-open** \u2014 single vendor created and primarily maintains it but has published under an open license (MCP from Anthropic, OpenAPI's early years at Wordnik).
4. **Community** \u2014 published by an individual or informal group with no parent org (llms.txt by Jeremy Howard, AGENTS.md after the OpenAI handoff).
5. **De-facto** \u2014 never formally published but treated as a spec because the dominant implementation defines it (README convention, package.json shape, the curl interface).

The model classifies the authority type from the spec name, primary URL, and search results before drafting Identity & Status. Every downstream section's treatment depends on which type.

This template runs on \`sonar-deep-research\` and skips image embedding by design \u2014 deep research returns better citation density and analytical length but unreliable image metadata. Visual identity for specs (logos, diagrams) lives in frontmatter, generated separately.

\`\`\`cft
provider: perplexity
model: sonar-deep-research
return-citations: true
return-images: false
# Idle-only safety \u2014 ceiling disabled. The per-chunk idle timer (270s for
# deep-research, inherited from the model-class default) is the sole
# safety mechanism: as long as Perplexity sustains bytes, the run is
# allowed to complete. A complete spec profile can stretch 6-9K words
# given the three-tier adoption section + named editors + critique
# framing; any wall-clock cap risks cutting the tail. Set this to a
# positive value (e.g., 3600000 for 60 min) if you want a hard ceiling.
request-timeout-ms: 0
# Generous output-token budget. Perplexity's default for sonar-deep-research
# is ~8192 tokens (~6K words), which silently truncates this template's
# back half by ending the stream cleanly with finish_reason: length
# mid-skeleton (looks like a healthy completion except the last several
# sections never appear). Bumped to 24000 (~18K-word budget) so the full
# 6-9K-word draft can land with headroom for the three-tier adoption
# section, deeper implementation cards, named critics, and the frontier.
max-tokens: 24000
system: |
  You are writing the analyst-grade profile of a STANDARD or SPEC named
  "{{basename}}" for an innovation consultant's vault.

  This is NOT an implementer's reference. Your reader is a strategist,
  founder, or operator who needs to understand the spec's significance,
  governance, and adoption landscape \u2014 not how to write a conformant
  implementation. Conformance matrices, MUST/SHOULD/MAY discipline, and
  wire-format details are out of scope. Stewardship, adoption tiers,
  political fault lines, and named critics are in scope.

  A SPEC PROFILE answers four questions a partner would ask:

  - WHAT is this spec, who wrote it, and who currently steers it?
  - WHY does it matter \u2014 what does it unlock, what has shifted because
    it exists, what has died because it exists?
  - WHO is using it (in three tiers: incumbents, challengers, innovators)
    and who is publicly NOT using it?
  - WHERE is the frontier \u2014 pending disputes, likely next versions, the
    political fault lines that will shape the spec's evolution?

  CLASSIFY THE AUTHORITY TYPE FIRST.

  Every spec falls into one of these five governance models, and your
  treatment of every section downstream depends on which one:

  - DE-JURE \u2014 formal standards body with legal or quasi-legal authority
    (W3C, IETF/RFC, ISO, IEEE, ECMA, NIST). Editors are publicly named
    in the spec itself; working group archives are public; decisions
    follow formal procedure.
  - INDUSTRY CONSORTIUM \u2014 non-vendor-controlled multi-stakeholder body
    (Khronos, Linux Foundation, OpenJS Foundation, OASIS, CNCF).
    Members are named companies; governance is documented in foundation
    bylaws.
  - VENDOR-LED-OPEN \u2014 a single vendor created and primarily maintains
    the spec but has published it under an open license and accepts
    community contributions (MCP from Anthropic, OpenAPI's early years
    at Wordnik).
  - COMMUNITY \u2014 published by an individual or informal group with no
    parent org (llms.txt by Jeremy Howard, AGENTS.md in its current
    form after the OpenAI handoff). Stewardship is by reputation and PR.
  - DE-FACTO \u2014 never formally published as a spec but treated as one
    by the ecosystem because the dominant implementation defines the
    behavior (the README convention, package.json's shape, the curl
    interface). Stewardship is implicit and shifts with the dominant
    implementation.

  Determine the authority type from the spec name, its primary URL, and
  search results before drafting Identity & Status. State the type
  explicitly in the Identity & Status section AND in the Snapshot
  callout line.

  Frontmatter for "{{basename}}":
  {{frontmatter}}

  FRONTMATTER FIELDS TO SURFACE FOR LATER PROMOTION:

  A curator promotes the named-creator and named-steward findings into
  structured frontmatter after the draft is written. To make that pass
  easy, surface these explicitly in the Snapshot lede callout AND in
  full detail in the Identity & Status section:

  - created_by \u2014 list of authors at inception (people OR orgs; prefer
    named persons + their affiliation at inception where public)
  - created_year \u2014 four-digit year of first public release
  - original_publisher \u2014 the org that first published it (if different)
  - maintained_by \u2014 current stewards (people, orgs, or "community")
  - stewardship_type \u2014 one of: de-jure | consortium | vendor-led-open
    | community | de-facto

  RESEARCH DISCIPLINE:

  - Use Perplexity's web search aggressively. For a spec profile,
    accuracy on governance and adoption matters more than encyclopedic
    breadth.
  - For every factual claim \u2014 author name, version date, implementation,
    transition story, critique, license terms \u2014 append an inline numeric
    citation marker [1], [2], etc. corresponding to the search-result
    order.
  - Quote phrasing from primary sources where useful: the spec text
    itself, editor blog posts, working-group meeting minutes, GitHub
    issues that captured the dispute, conference talks where the
    editors presented the spec.
  - Prefer primary surfaces: the spec's canonical URL, the working
    group's mailing list archive or GitHub repo, the editors' own
    posts, the implementing-org's announcements. Aggregator pages
    (Wikipedia, blog roundups, "X explained" articles) are fallbacks
    for orientation only.
  - Do NOT cite this Perplexity response itself, only the underlying
    sources.

  EDITORIAL STANCE \u2014 name the humans, not just the orgs:

  Specs are written by people. Training data over-represents the
  sponsoring org's logo and under-represents the named editors who
  actually drafted the text and made the design choices. Counteract
  this systematically:

  - In \`created_by\` and \`maintained_by\`, prefer NAMED PERSONS where
    public. "Anthropic" is acceptable; "Anthropic + David Soria Parra
    + Justin Spahr-Summers" is what an analyst wants.
  - In Governance & Stewardship, name the editors, working group
    chairs, and sponsoring partners with their roles. Not "the
    working group decided" \u2014 name the chair and the decision.
  - For DE-JURE specs, the editor names are on the cover of the spec
    itself; surface them.
  - For VENDOR-LED-OPEN specs, name both the originating team (the
    people who shipped it) AND the cross-vendor partners who have
    since contributed substantively.
  - For COMMUNITY specs, the originator's identity is the spec's
    political center; name them prominently.

  THREE-TIER ADOPTION FRAMING \u2014 this is STRUCTURAL, not editorial:

  The Adoption section is partitioned into three sub-buckets, and each
  has its own discipline:

  - INCUMBENTS \u2014 the dominant implementations that the ecosystem
    treats as canonical or near-canonical. This includes the
    reference implementation (if there is one), the most-deployed
    OSS implementation, and the commercial implementations from
    market leaders. 4-8 named entries. Big tech BELONGS HERE if it
    has implemented the spec \u2014 do not suppress.
  - CHALLENGERS \u2014 production-grade alternative implementations that
    compete with the incumbents on completeness or performance,
    often from mid-sized companies or well-funded startups. 4-8
    entries. These are the implementations that keep the incumbents
    honest.
  - INNOVATORS \u2014 early-stage, experimental, or research
    implementations exploring the spec's edges, novel extensions, or
    unusual integration patterns. Often single-developer or
    research-lab projects. 4-8 entries. This is where the next
    extensions will come from.

  Within each bucket, render entries in \`[Name](url) \u2014 one-line
  description\` form. After the three buckets, surface NOTABLE HOLDOUTS
  \u2014 orgs that explicitly declined to implement, forked, or are running
  incompatible alternatives \u2014 as a separate short paragraph. The
  holdouts are often as informative as the adopters about where the
  spec's design choices have made enemies.

  IMPLEMENTATION CARD SHAPE (deeper treatment for top entries):

  For the top 2-3 implementations PER TIER \u2014 the ones a partner would
  expect to be briefed on by name \u2014 produce a deeper card:

      #### [Implementation Name](https://homepage.url)
      **Steward**: the org or individual maintaining this implementation,
      with one-line context on their relationship to the spec (authoring
      participant, early adopter, late convert, fork). Cite. [N]
      **Coverage of the spec**: which parts of the spec are implemented,
      which are explicitly not, any extensions added beyond spec. Cite. [N]
      **Adoption signal**: who uses this implementation in production
      (named customer, named project, GitHub stars / downloads if
      relevant). Cite. [N]
      **Why it matters**: one sentence on the strategic significance \u2014
      the distribution channel it commands, the conformance bar it sets,
      the political coalition it represents. Cite. [N]

  STEWARDSHIP TRANSITIONS \u2014 surface these explicitly:

  When the created-by org and the maintained-by org are different, that
  transition is itself a story worth its own paragraph. Canonical
  examples to model the depth of treatment on:

  - AGENTS.md: OpenAI \u2192 community (via Sourcegraph)
  - OpenAPI: Wordnik \u2192 SmartBear \u2192 Linux Foundation (OpenAPI Initiative)
  - HTTP: Tim Berners-Lee/CERN \u2192 IETF / W3C
  - JSON: Douglas Crockford \u2192 IETF (RFC 8259) + Ecma (ECMA-404) \u2014 two
    parallel stewards

  In Governance & Stewardship, when a transition has happened, give it
  a dedicated paragraph: WHEN the transition was announced, WHO handed
  to WHOM, WHAT triggered the handoff, what changed in governance pace
  or direction as a result. Cite the transition announcement.

  CRITIQUE \u2014 be candid, do not adjudicate:

  A spec without public critics is either (a) too young to have
  attracted critique, or (b) so dominant that nobody bothers. For any
  spec older than 18 months, there should be at least 2-3 publicly
  named critics worth surfacing in Critique & Open Disputes. Name them,
  link to their critique, summarize their argument in one sentence
  each. Do not rebut \u2014 the analyst's job here is to surface the
  disagreement so the partner reading the memo knows the political
  landscape, not to settle it.

  LINKS AND WIKILINKS:

  - For implementation names, editor names, and source links, use
    \`[Name](https://url)\` form.
  - Do NOT invent \`[[wikilink]]\` syntax. The curator will promote
    names to vault wikilinks during the curation pass. If you happen
    to know a canonical adjacent spec the curator has already vaulted
    (e.g., "JSON-RPC", "OAuth 2.0", "OpenAPI"), surface the name as
    plain text in the Adjacent Specs section so the curator can
    wikilink it later.

  CALIBRATION ON LENGTH:

  This is a deep-research run. Lean long, not short. A complete spec
  profile is roughly 6,000-9,000 words of body, with 12-24 named
  implementations across three tiers + holdouts, 2-3 deeper cards per
  tier for the most strategically significant implementations, a
  documented stewardship transition where relevant, and 2-4 named
  critics in Critique & Open Disputes. Better to over-enumerate and
  let the curator prune than to under-enumerate and leave the analyst
  guessing.
\`\`\`

# Snapshot

- One-paragraph italicized lede (max 2 sentences) that captures the spec's significance in a single beat. Voice: the analyst opening their memo. Use markdown italics: \`_..._\`.
- Immediately after the lede, a one-line bold callout in this exact shape: \`**Created by** {name(s)} ({year}) \xB7 **Maintained by** {name(s)} \xB7 **Type:** {de-jure | consortium | vendor-led-open | community | de-facto}\`. This is the spec's identity at a glance.
- Then the headline stat or framing quote \u2014 one cited statement (an adoption number, a developer-survey result, a notable adopter's framing of why they picked it, a critic's signature objection) from a credible source. Format as a blockquote (\`> "..."\`).
- Then 2-3 sentences orienting the reader: what is this spec, what does it constrain or enable, and why is it worth profiling right now.

# The Question this Spec Answers

- One paragraph (3-5 sentences) stating the coordination failure, interop gap, or pain point this spec was created to address.
- What was the world like in the period before this spec existed? What were people doing instead \u2014 bespoke per-vendor integrations, fragmented forks, lock-in to proprietary APIs?
- What does the spec's existence allow that wasn't possible (or was prohibitively expensive) before? Be specific \u2014 name the kinds of products, integrations, or workflows that the spec made tractable.

# Identity & Status

- **Full name** and commonly-used abbreviation.
- **Type:** protocol / data format / API / behavior spec / schema / process spec / RFC / convention.
- **Authority type:** state explicitly which of the five \u2014 de-jure / industry consortium / vendor-led-open / community / de-facto \u2014 and cite the evidence.
- **Created by:** named persons and orgs at inception, with affiliations as of the inception date.
- **Created year:** four-digit year of first public release.
- **Original publisher:** if different from creators.
- **Maintained by:** current stewards (people, orgs, foundation, or "community").
- **Current version** and **lifecycle stage** \u2014 use whatever taxonomy the spec itself uses (Draft / Working / Recommendation / Stable / Deprecated; or numbered milestones; or "alive / abandoned" for community specs).
- **License:** publishing license of the spec text itself (CC-BY? MIT? bespoke?) and patent-grant terms if relevant.
- **Canonical URL** of the spec.

# Why It Matters

What this spec unlocks, and what has shifted because it exists.

- 3-5 cited bullets covering WHAT IT UNLOCKS: the interop, coordination, or portability story that the spec enables. Be specific about what kinds of integrations, products, or customer escapes from lock-in become possible. Where possible, quote a founder, editor, or implementer who named the unlock.
- 3-5 cited bullets covering WHAT IMPACT IT HAS HAD (or is having): named adopters that shipped because of it, named projects that died because of it (or that the spec rendered unnecessary), named market shifts in vendor positioning, named regulatory or procurement-policy changes that referenced the spec. Surface both adoption AND resistance \u2014 who explicitly chose to ignore or fork, and why their stated reasoning matters.
- If the spec is too young to have demonstrable impact yet (under 12 months from first public release), say so explicitly and pivot to predicted impact based on the early-adoption signals \u2014 naming the early-adopting orgs and quoting their stated reasons for adopting early.

# Position in the Ecosystem Stack

- **What it depends on** \u2014 the layers underneath that the spec assumes. Name the underlying specs or de-facto conventions (e.g., MCP depends on JSON-RPC and HTTP; A2A depends on HTTP/SSE; AGENTS.md depends on markdown's conventions). For each, cite where the dependency is documented in the spec text.
- **What depends on it** \u2014 the layers that have been built on top of this spec by other authors. 4-8 named downstream specs, protocols, or conventions with one-line each on how they extend or consume this spec.
- **Companion specs** \u2014 specs deliberately designed to work alongside this one, often by the same authoring group (e.g., OAuth 2.0 companions: PKCE, dPoP; MCP companions: capability negotiation specs). One paragraph naming 3-5 companions.
- **Strategic positioning:** one sentence \u2014 what part of the stack does this spec colonize, and why does that position matter for whoever wants to compete with the dominant implementations?

# Lineage

- **Predecessors** \u2014 earlier specs or de-facto conventions in the same problem space. For each, one-line on what they got wrong, what they got right that this spec inherited, and why the ecosystem ultimately moved on.
- **Parallel efforts** \u2014 concurrent specs from other authoring groups solving the same coordination problem differently. Name 2-4, with one-line each on their distinguishing bet and current adoption signal relative to this spec.
- **Likely successors** \u2014 emerging specs or research efforts that may eventually supersede this one, OR an explicit statement that no successor is visible yet. If a successor exists, name its authoring group and current status.

# Governance & Stewardship

- **Editors / chairs / sponsoring partners** \u2014 named individuals with their roles. For DE-JURE specs, lift the editor list from the spec's cover. For VENDOR-LED-OPEN specs, name both the originating team and the cross-vendor contributors who have committed substantively. For COMMUNITY specs, the originator's identity is the political center \u2014 name them prominently.
- **Where decisions get made** \u2014 the mailing list, GitHub org, working-group meeting, or governance forum. Cite the URL of the public archive.
- **Pace** \u2014 release cadence, date of last meaningful update, typical time between major versions.
- **Versioning policy** \u2014 semver / calendar / named milestones / RFC numbering / "live spec, no versions."
- **STEWARDSHIP TRANSITIONS** \u2014 if \`created_by\` and \`maintained_by\` differ, this gets its own paragraph: when the transition was announced, who handed to whom, what triggered the handoff (loss of vendor interest, community pressure, foundation absorption, fork-takeover), what changed in pace or direction as a result. Cite the transition announcement post or RFC.
- **Political fault lines** \u2014 2-3 sentences naming the working-group disputes (or implementer disputes) that have been publicly archived. Where is the coalition holding together and where is it under strain? Cite the GitHub issue, mailing-list thread, or talk where the dispute is most visible.

# Adoption \u2014 by Tier

The three-tier framing is structural. Each tier has its own subsection with its own discipline. After the three tiers, surface notable holdouts as a separate short paragraph.

## Incumbents

- 4-8 dominant implementations the ecosystem treats as canonical or near-canonical. The reference implementation belongs here if there is one. Big tech belongs here if it has implemented the spec \u2014 do not suppress.
- Format: \`[Implementation Name](https://url) \u2014 one-line on what they ship and their relationship to the spec\`. Cite each.
- After the flat list, produce 2-3 deeper IMPLEMENTATION CARDS for the most strategically significant entries per the card shape defined in the system prompt.

## Challengers

- 4-8 production-grade alternative implementations that compete with the incumbents on completeness, performance, or coverage of optional spec capabilities. Often from mid-sized companies or well-funded startups.
- Same format as Incumbents, with 2-3 deeper cards for the most significant.

## Innovators

- 4-8 early-stage, experimental, or research implementations exploring the spec's edges, novel extensions, or unusual integration patterns. Often single-developer projects, research-lab outputs, or open-source projects with small but engaged communities.
- Same format as Incumbents, with 2-3 deeper cards for the most significant.

## Notable Holdouts

- One short paragraph (3-6 sentences) naming 2-5 orgs or projects that explicitly declined to implement, forked the spec, or are running incompatible alternatives. Name each holdout, link to where they stated their position, summarize their reasoning in one sentence. The holdouts are often as informative as the adopters about where the spec's design choices have made enemies.

# Critique & Open Disputes

- 2-4 named critics (people or orgs) with their argument summarized in one sentence each. Format: \`**Critic Name** ([affiliation](url)) \u2014 "their argument in one sentence" [N]\`.
- 1-2 sentences on the known limitations the editors themselves have admitted (in mailing-list posts, GitHub issues, conference Q&A).
- 1-2 sentences on the working-group fault lines that are publicly archived \u2014 where members have voted against each other, where a proposal was withdrawn under pressure, where a fork was threatened.
- Do NOT rebut the critique here. Surface the disagreement; do not adjudicate it. The partner reading the memo will form their own view.

# Frontier & Open Questions

- 4-6 bullets, each a specific open question that the working group, implementers, or critics are actively debating. Frame each as a question, not a statement.
- Pair each question with a one-sentence note on which editors, working groups, or implementations are most likely to drive the resolution.
- Where pending RFCs / extensions / next-version drafts are public, link to them and note their current status (proposed / under review / rejected / merged).

# Media, Voices, and Coverage

- 6-12 bullets covering the editors' own posts and talks, the credible critics' coverage, the implementer blogs that document real-world deployment, and the podcasts/conferences where the spec is regularly debated.
- Format: \`**Name** \u2014 Platform \u2014 one-line note on their angle / why they are worth following\`. Include a primary URL link.
- Sub-group with \`## Editor & Maintainer Voices\`, \`## Implementer Coverage\`, \`## Critic Coverage\`, \`## Conferences & Working Group Forums\` if the list is long enough to warrant it.
- Prefer specialized voices over generalist tech press. Prefer the editors' own posts over recapped coverage.

# Adjacent Specs and Standards

- 4-8 plain-text spec names (no wikilink syntax \u2014 the curator wikilinks during curation) that an operator working with this spec would want to explore next.
- Mix of: predecessor and successor specs, companion specs, competing specs from parallel efforts, and foundational specs this one depends on.
- Format: \`- <Spec Name> \u2014 one-line on how it adjoins this spec\`.

***

# User Notes

Anything below the \`***\` line is excluded from the request. Use this zone for:

- Hand-curated notes on the spec's relevance to your own work, portfolio, or thesis.
- Curator's wikilink resolution notes during the curation pass \u2014 which named editors, implementations, or adjacent specs have vault entries that need linking back.
- Iteration history while you refine the template for specific spec types.
- Tuning notes on which sections came back thin and need a re-run.

## Multi-stage roadmap (deferred)

This v1 template is intentionally single-stage: one Perplexity Deep Research run produces the full draft. The curator promotes implementation names to \`[[wikilink]]\` form, adds vault-specific cross-references to other vaulted specs, and adds \`:::tool-showcase\` blocks for vault-tracked implementations during the curation pass.

The deferred multi-stage version mirrors the market-map roadmap and is tracked in \`context-v/explorations/Multi-Stage-Cooperative-Claude-and-Perplexity-with-RAG.md\`:

1. **RAG pre-flight** \u2014 pull canonical Lossless sources adjacent to this spec (other vaulted specs in \`Sources/Standards-and-Specs/\`, the \`open-specs-and-standards\` study, any prior commentary in \`concepts/\` or \`Tooling/\`) as primed context.
2. **Perplexity research stage** \u2014 deep research with the RAG context as primer, eliminating the wikilink-invention problem and letting the model name actual vault entries.
3. **Claude editing stage** \u2014 an editorial pass that enforces the analyst voice, prunes over-enumeration, sharpens the three-tier adoption boundaries, and emits the final \`[[wikilink]]\` form.
`;var fi=`---
title: Market Category Profile (Analyst Draft)
applies-to-paths:
  - "concepts/Market-Categories/**"
  - "Market-Categories/**"
description: Generates an analyst-grade profile of a named market category \u2014 its definition, the forces that made it coherent right now, current CAGR and momentum, and the three-tier company landscape (incumbents / challengers / innovators) with explicit financial-stage definitions for each tier.
date_created: 2026-05-27
date_modified: 2026-05-27
---

# About this template

Use this for files under \`concepts/Market-Categories/\` whose body is empty or whose curated lead-in (a thesis paragraph or stake-in-the-ground take) has been authored but the analytical body is missing.

A **market category profile** is the mental-model entry an innovation consultant draws on when asked "what is this market, who's playing in it, and where is it going?" Unlike a [[market-map-profile]] (which is a published analyst memo with sub-segments and lighthouse examples), this profile is a concept-folder entry \u2014 a reference card the curator returns to when reading or briefing on the category.

The structure is opinionated about ONE thing in particular: the three-tier company landscape is **structural**, not editorial. Each tier has an explicit financial-stage definition, and the template asks the model to populate each tier separately:

- **Incumbents** \u2014 large public companies, tech giants, late-stage private, PE-owned behemoths. Legacy footprint, named everywhere in the category. Big tech BELONGS HERE \u2014 do not suppress.
- **Challengers** \u2014 well-funded scale-ups (Series C and beyond, or recently public via SPAC/IPO). Rapidly growing, hype-driven, eating share from the incumbents.
- **Innovators** \u2014 Pre-Seed through Series B startups. Early-stage, often founder-led, novel-bet positioning, the frontier of the category.

This is a different editorial discipline from the \`market-map-profile\` template \u2014 for a market map, the analyst is enumerating sub-segments and innovators within them, and big tech gets capped to 1 of 5-10 to counteract training-data over-representation. For a market-category profile, the goal is the *full* landscape of who plays in this market, sorted by financial stage. Both incumbents and innovators are first-class.

This template runs on \`sonar-deep-research\` and skips image embedding by design \u2014 deep research returns better citation density and analytical length but unreliable image metadata. Banner / portrait / square imagery for category entries lives in frontmatter, generated separately (Ideogram).

\`\`\`cft
provider: perplexity
model: sonar-deep-research
return-citations: true
return-images: false
# Idle-only safety \u2014 ceiling disabled. The per-chunk idle timer (270s
# for deep-research, inherited from the model-class default) is the
# sole safety mechanism: as long as Perplexity sustains bytes, the run
# is allowed to complete. A complete market-category profile can stretch
# 6-9K words given the three-tier company landscape + named market
# reports + What's Happening section; any wall-clock cap risks cutting
# the tail. Set this to a positive value if you want a hard ceiling.
request-timeout-ms: 0
# Generous output-token budget. Perplexity's default for sonar-deep-research
# (~8192 tokens, ~6K words) silently truncates this template's back half
# by ending the stream cleanly with finish_reason: length mid-skeleton.
# Bumped to 24000 (~18K-word budget) so the full three-tier landscape +
# deeper cards + industry coverage section can land with headroom.
max-tokens: 24000
system: |
  You are writing the analyst-grade profile of a MARKET CATEGORY named
  "{{basename}}" for an innovation consultant's vault.

  A market-category profile is the mental-model entry an analyst returns
  to when asked "what is this market, who's in it, and where is it
  going?" It is NOT a published market map (those live in
  \`lost-in-public/market-maps/\` and run a different template). It IS a
  concept-folder reference card with disciplined three-tier company
  framing and explicit market-data sourcing.

  A CATEGORY PROFILE answers four questions a partner would ask:

  - WHAT is this market category \u2014 how are its boundaries drawn, what's
    in and what's out?
  - WHY NOW \u2014 what forces aligned to make this category coherent or
    expandable at this moment?
  - WHAT'S HAPPENING \u2014 what is the CAGR, the momentum, the category
    creation or coalescence dynamics right now, named with specific
    market-report figures?
  - WHO IS PLAYING in three explicit financial-stage tiers \u2014 incumbents,
    challengers, innovators \u2014 with named cited entities in each?

  THREE-TIER COMPANY FRAMING \u2014 STRUCTURAL, NOT EDITORIAL.

  Each tier has an explicit financial-stage definition. Sort each
  named company into exactly one tier:

  - INCUMBENTS \u2014 large public companies, tech giants, late-stage
    private companies (typically post-Series E or with $1B+ valuation
    and 10+ years of operation), and private-equity-owned behemoths.
    The defining trait is legacy footprint with huge market presence \u2014
    these are the companies an enterprise buyer ALREADY has a contract
    with, even if not in this category yet. Big tech (Microsoft,
    Google, Amazon, Apple, Meta, Oracle, Salesforce, IBM, Adobe,
    SAP, Cisco, Nvidia post-2020) belongs HERE if it has a relevant
    offering in the category \u2014 DO NOT suppress.
  - CHALLENGERS \u2014 well-funded scale-ups, typically Series C through
    pre-IPO, or recently public via SPAC/IPO with under 7 years of
    operation. The defining traits are rapid growth, public hype
    (analyst coverage, founder press, conference keynotes), and the
    capital position to credibly threaten incumbent market share.
    "Recently IPO'd unicorn" usually belongs here, not in Incumbents.
  - INNOVATORS \u2014 Pre-Seed through Series B funded startups. The
    defining traits are early-stage funding, novel-bet positioning
    (often a contrarian thesis on the category's shape), and
    typically founder-led with under 100 employees. This is where
    the next category-redefinition will come from.

  For each tier, produce 5-8 named entities. Render each entry in
  \`[Company Name](https://url) \u2014 one-line on their role in this category\`
  form, then produce 2-3 deeper CARDS per tier for the most
  strategically significant entries (the ones a partner would
  expect to be briefed on by name).

  Frontmatter for "{{basename}}":
  {{frontmatter}}

  TIER-CARD SHAPE (deeper treatment for top entries per tier):

  Each deeper card follows this shape exactly. The emphasis SHIFTS by
  tier \u2014 for Incumbents the Footprint line is heaviest, for Innovators
  the Funding line is heaviest:

      #### [Company Name](https://homepage.url)
      **Stage**: public (EXCHANGE: TICKER) | late-stage private (last
      round date) | PE-owned (sponsor name + acquisition year) |
      scale-up | Series B (date) | Pre-Seed / Seed (date)
      **Funding**: total raised + most recent round + lead investor + year.
      For public companies: market cap (as of recent quarter) + last reported
      revenue. For PE-owned: known acquisition price if disclosed. Cite. [N]
      **Footprint**: revenue / employees / customer count / countries
      served \u2014 whatever's most visible. Heaviest for INCUMBENTS. Cite. [N]
      **Why they're in this category**: one specific sentence on what
      they ship into this market and what their angle is. Not marketing
      adjectives; a concrete differentiator or footprint claim. Cite. [N]
      **Coverage**: 1-2 references in trade press, founder podcasts, or
      analyst notes. Format: \`[Outlet, Title](url)\`. Cite. [N]

  INDUSTRY DATA AND COVERAGE \u2014 name the reports, not just the figures.

  The "Industry Coverage and Market Data" section is sub-grouped into
  three explicit subsections:

  - Market Reports \u2014 Gartner, IDC, Forrester, McKinsey, ABI Research,
    Bain, BCG, Deloitte Insights, Frost & Sullivan, Grand View Research,
    Mordor, Markets and Markets, Cabinet Office reports, etc. Name the
    REPORT (with title and year) AND the firm. Quote the figure plus the
    methodology framing (top-down vs bottom-up, geography, year range).
  - Industry Articles \u2014 specialized trade press (sector verticals from
    TechCrunch, The Information, Stratechery, sector-specific trade
    publications, named founder/operator blogs). Prefer NAMED journalists
    and operator-thinkers over generic outlet citations.
  - Financial News \u2014 Bloomberg, FT, WSJ, Pitchbook articles, Reuters,
    Crunchbase News, dealroom.co, Seeking Alpha, Tegus. These should be
    the source for funding-round figures, M&A activity, public-company
    earnings calls referencing the category.

  RESEARCH DISCIPLINE:

  - Use Perplexity's web search aggressively. For a market-category
    profile, breadth of named entities and cited market data both
    matter \u2014 you are populating a reference card that the analyst will
    return to dozens of times.
  - For every factual claim \u2014 funding round, market sizing, CAGR
    figure, revenue, market cap, customer name \u2014 append an inline
    numeric citation marker [1], [2], etc.
  - Quote phrasing from primary sources where useful (founder interviews,
    earnings notes, analyst report excerpts, regulatory filings).
  - Prefer primary surfaces: company homepage, S-1 filings, earnings
    calls, founder Twitter/X, technical blog posts, conference keynotes.
    Aggregator pages (Crunchbase summaries, PitchBook profiles,
    Wikipedia) are fallbacks for funding stage and headcount only.
  - Do NOT cite this Perplexity response itself, only the underlying
    sources.

  WHY NOW AND WHAT'S HAPPENING \u2014 DIFFERENT BEATS.

  These two sections are easy to conflate; keep them distinct:

  - WHY NOW asks: what FORCES aligned that made this category coherent
    (or expandable) right now? Technological unlocks, regulatory shifts,
    capital-formation patterns, customer-behavior shifts. The reader
    leaves Why Now understanding the ENABLING CONDITIONS.
  - WHAT'S HAPPENING asks: what is the current MOMENTUM \u2014 CAGR figures
    with sources, category-creation events (a defining IPO, a defining
    acquisition, a defining product launch that crystallized the
    category name), recent capital concentration. The reader leaves
    What's Happening understanding the CURRENT VELOCITY and where the
    capital is flowing.

  EDITORIAL STANCE:

  - This is a market-category profile, NOT a market-map analyst memo.
    There is no anti-incumbent cap \u2014 name the big tech in Incumbents,
    name the well-funded scale-ups in Challengers, name the Pre-Seed
    bets in Innovators. The three-tier sorting IS the discipline.
  - Where a company could plausibly fit in two tiers (a unicorn that
    just IPO'd; a late-stage private that's behaving like a scale-up),
    pick the tier that best matches the company's CURRENT behavior and
    note the ambiguity in the card's "Why they're in this category"
    line.
  - Surface CATEGORY DISPUTES \u2014 sentences in the prose where credible
    operators disagree about whether the category boundary should
    include or exclude a particular sub-area. Disputes are signal.

  LINKS AND WIKILINKS:

  - For company names, founder names, and source links, use
    \`[Name](https://url)\` form.
  - Do NOT invent \`[[wikilink]]\` syntax. The curator will promote
    names to vault wikilinks during the curation pass.
  - If you happen to know a canonical adjacent concept the curator
    has already vaulted (e.g., "Agentic Workspaces", "Compliance
    Automation"), surface the name as plain text in the Adjacent
    Concepts section so the curator can wikilink it later.

  CALIBRATION ON LENGTH:

  This is a deep-research run. Lean long, not short. A complete
  market-category profile is roughly 6,000-9,000 words of body, with
  15-24 named companies across three tiers (5-8 per tier) + 2-3 deeper
  cards per tier, a fully-populated Industry Coverage & Market Data
  section with 4-6 named reports / articles / news pieces per
  sub-grouping, and explicit cited CAGR / TAM figures in What's
  Happening. Better to over-enumerate and let the curator prune than
  to under-enumerate and leave the analyst guessing.
\`\`\`

# Snapshot

- One-paragraph italicized lede (max 2 sentences) that captures the category in a single beat. Voice: an analyst introducing the category to a partner who's never heard of it. Use markdown italics: \`_..._\`.
- Then the headline stat \u2014 one cited statistic that signals scale, velocity, or category momentum (current TAM, current CAGR, a recent landmark funding round, a defining exit). Format as a blockquote (\`> "..."\`).
- Then 2-3 sentences orienting the reader: what is this category, what timeframe is the profile capturing, why is it worth a reference card right now.

# What is this Market Category?

- 3-5 sentences defining the category. What problems do its products solve? What customer is it sold to? What does the category EXCLUDE \u2014 what does the boundary leave out that a naive reader might wrongly include?
- One sentence on where the boundary is fuzzy or disputed \u2014 name the specific edges where operators disagree about whether something belongs.

# Why Now?

- 3-5 cited bullets, each one a specific FORCE that aligned to make this category coherent or expandable in the current quarter. The reader should leave understanding the ENABLING CONDITIONS.
- Force types to consider: technological unlocks (a capability crossing a cost / latency / accuracy threshold), regulatory or standards shifts, capital-formation patterns (a fund vintage, an exit precedent that opened the LP appetite), customer-behavior shifts, an open-source release that lowered the floor for new entrants.
- Cite each force. Where possible, quote a founder, analyst, or operator who named the force in public.

# What's Happening?

What's the current momentum, in cited numbers and named events.

- **CAGR and TAM:** 2-3 cited bullets covering the current CAGR estimate, TAM, and forecast year range \u2014 naming both the figure AND the report it comes from. Where two credible sources disagree (Gartner says $X by Y, IDC says $Z by Y), surface the disagreement explicitly.
- **Category creation events:** 2-3 cited bullets covering the defining moments \u2014 a landmark IPO that crystallized the category name; a defining acquisition that signaled incumbent recognition; a defining product launch that became the category's reference implementation; a defining analyst-report-naming-the-category event.
- **Capital concentration:** 2-3 cited bullets covering where funding has concentrated by tier (e.g., "$3B raised by Series B-D scale-ups in the category in 2025, led by [named funds]"), with named lead investors where public.

# Market Incumbents

Large public companies, tech giants, late-stage private (post-Series E or $1B+ valuation with 10+ years of operation), or private-equity-owned behemoths. Legacy with huge market footprint. Big tech belongs here when they have a relevant offering \u2014 do not suppress.

- 5-8 named entities. Format: \`[Company Name](https://url) \u2014 one-line on their role and footprint in this category\`. Cite each.
- After the flat list, produce 2-3 deeper TIER-CARDS for the most strategically significant entries per the card shape in the system prompt. For Incumbents, the **Footprint** line is the heaviest field \u2014 market cap, revenue, customer count, geographic reach.

# Market Challengers

Well-funded scale-ups (Series C and beyond, or recently public via SPAC/IPO with under 7 years of operation). Rapidly growing, hype-driven, public analyst coverage, capital position to credibly threaten incumbent share.

- 5-8 named entities. Same format as Incumbents.
- After the flat list, produce 2-3 deeper TIER-CARDS for the most strategically significant. For Challengers, both **Funding** and **Footprint** matter equally \u2014 funding shows the war chest, footprint shows the traction.

# Market Innovators

Pre-Seed through Series B funded startups. Early-stage, often founder-led, novel-bet positioning, typically under 100 employees. This is where the next category-redefinition will come from.

- 5-8 named entities. Same format as Incumbents.
- After the flat list, produce 2-3 deeper TIER-CARDS for the most strategically significant. For Innovators, the **Funding** line is the heaviest field \u2014 round size, lead investor, date, total raised, and the contrarian thesis the round capitalized.

# Industry Coverage and Market Data

The sourcing layer \u2014 where to read about this category and where the figures came from. Group into three subsections:

## Market Reports

- 4-6 named market reports. Format: \`**[Report Title, Year](url)** \u2014 Firm \u2014 one-line on the report's signature finding or methodology. [N]\`
- Prefer specialized analyst firms (ABI Research, Forrester, Gartner, IDC, Frost & Sullivan, Grand View Research) over generalist business publications.
- Where a report's headline figure has been quoted in this profile (CAGR, TAM), the citation should resolve to the report itself, not a press release recapping it.

## Industry Articles

- 4-6 named articles, blog posts, or essays from specialized trade press and operator-thinkers. Format: \`**[Title](url)** \u2014 Outlet / Author \u2014 one-line on the angle. [N]\`
- Prefer named journalists and operator-bloggers over generic outlet citations. Founder posts on Substack / personal blog count and are often the most useful.

## Financial News Sources

- 4-6 named financial news pieces covering funding rounds, M&A activity, public-company earnings calls referencing the category, or sell-side analyst notes. Format: \`**[Title](url)** \u2014 Outlet \u2014 one-line on what it reports. [N]\`
- Prefer Bloomberg, FT, WSJ, Reuters, Pitchbook, Crunchbase News, dealroom.co for primary funding/M&A signal. Use Seeking Alpha / Motley Fool / Yahoo Finance only for public-company earnings recaps when the primary source isn't available.

# Frontier and Open Questions

- 4-6 bullets, each a specific open question about where the category is going. Frame each as a question, not a statement.
- Pair each question with a one-sentence note on which tier (Incumbents / Challengers / Innovators) or which named operators are most likely to drive the resolution.
- Surface category-boundary disputes explicitly \u2014 where credible operators disagree about whether the category should expand to include adjacent functions, or contract to focus on a narrower core.

# Adjacent Concepts and Categories

- 4-8 plain-text concept names (no wikilink syntax \u2014 the curator wikilinks during curation) that an operator working in this category would want to explore next.
- Mix of: adjacent market categories (other categories this one borders), foundational concepts (mental models the category sits on), and vocabulary terms (specific jargon the curator may want to define in \`Vocabulary/\`).
- Format: \`- <Concept Name> \u2014 one-line on how it adjoins this category\`.

***

# User Notes

Anything below the \`***\` line is excluded from the request. Use this zone for:

- The stake-in-the-ground take or thesis paragraph you want to fold into the model's context. To do that, move the paragraph ABOVE the \`***\` divider before running the template.
- Curator's wikilink resolution notes during the curation pass \u2014 which named companies, founders, or adjacent concepts have vault entries that need linking back.
- Tuning notes on which sections came back thin and need a re-run.
- Hand-curated notes on the category's relevance to your portfolio or thesis.

## Relationship to other shipped templates

- **\`market-map-profile\`** \u2014 for published analyst-grade maps in \`lost-in-public/market-maps/\`. That template produces a memo with sub-segments and lighthouse examples in flowing analyst prose. THIS template (market-category-profile) is a concept-folder reference card with the disciplined three-tier financial-stage framing.
- **\`concept-profile\`** \u2014 for general \`concepts/**\` entries. The market-category template targets the narrower \`concepts/Market-Categories/\` sub-folder and overrides the general concept template's editorial stance (which suppresses big tech) \u2014 for a category profile, naming the incumbents IS the goal.
- **\`toolkit-profile\`** \u2014 for individual tools/products/platforms in \`Tooling/**\`. Many companies named in this template's tiers will have their own toolkit-profile entries that the curator wikilinks back to.

## Multi-stage roadmap (deferred)

This v1 template is intentionally single-stage. The deferred multi-stage version mirrors the market-map and standards-and-specs roadmaps, tracked in \`context-v/explorations/Multi-Stage-Cooperative-Claude-and-Perplexity-with-RAG.md\`:

1. **RAG pre-flight** \u2014 pull canonical Lossless sources adjacent to this category (vaulted company profiles in \`Tooling/\`, adjacent vaulted categories, prior commentary in \`concepts/\`) as primed context.
2. **Perplexity research stage** \u2014 deep research with the RAG context as primer, eliminating wikilink invention and letting the model name actual vault entries.
3. **Claude editing stage** \u2014 editorial pass that enforces tier discipline, prunes over-enumeration, sharpens tier boundaries (especially for the unicorn-just-IPO'd ambiguity), and emits the final \`[[wikilink]]\` form.
`;var yi=`# Partials

Reusable snippets referenced from templates via \`{{include: <name>}}\`. The plugin reads partials live from this folder at request time, so edits take effect on the next "Apply template" run without rebuilding the plugin.

## Syntax

In a template (or preamble, or another partial):

\`\`\`
{{include: mermaid-discipline}}
\`\`\`

Resolves to \`<partialsRoot>/mermaid-discipline.md\`. The \`.md\` extension is optional. Frontmatter in the partial is stripped before splicing.

## Recursion

Partials may include other partials. The expander enforces:

- **Max depth 5** \u2014 guards against accidental deep nesting.
- **Cycle detection** \u2014 a partial that (transitively) includes itself errors at the cycle, not by stack overflow.

## Missing-file behavior

A typo or missing partial surfaces as an inline marker in the output:

\`\`\`
[[include: typo-name \u2014 file not found]]
\`\`\`

This is intentional \u2014 partials are explicitly invoked from the template, so a missing one is the user's bug to fix, not infrastructure to paper over.

## Tokens

Partials support the same \`{{basename}}\` / \`{{title}}\` / \`{{frontmatter}}\` / \`{{today}}\` / \`{{frontmatter.X}}\` tokens as templates. Token substitution runs **after** include expansion, so partials may reference any token the calling template would have access to.
`;var bi='**Mermaid syntax discipline \u2014 read every rule before emitting a fence; broken mermaid is the #1 failure mode of these templates.** Mermaid is a strict parser. Every chart you emit must follow these rules or the page renders a syntax error instead of the diagram. Each rule below pairs a BAD example with a GOOD example \u2014 match the GOOD shape exactly.\n\n**Quote every multi-word node and edge label in double quotes.** The parser cannot handle `(`, `)`, `&`, `:`, `,`, `/`, `#`, `=`, `+`, `[`, `]`, `{`, `}`, `<`, `>`, `|`, backtick, or LaTeX syntax inside a bare label. When in doubt, quote.\n\n- BAD:  `A[Raw inputs (text, audio)]`\n- GOOD: `A["Raw inputs (text, audio)"]`\n\n- BAD:  `B -->|Sends data & status| C`\n- GOOD: `B -->|"Sends data &amp; status"| C`\n\n**Escape `&` as `&amp;` inside quoted labels.** Bare `&` is interpreted as the start of an HTML entity even when the label is quoted.\n\n- BAD:  `D["Search & filter"]`\n- GOOD: `D["Search &amp; filter"]`\n\n**No nested double quotes.** The outer `"..."` is the only quoting layer the parser supports. Drop the inner quotes or rephrase.\n\n- BAD:  `B["Legal view<br/>\\"Which laws apply?\\""]`\n- GOOD: `B["Legal view<br/>Which laws apply?"]`\n\n**Line breaks inside labels are `<br/>`, never `\\n`.** `\\n` renders as the literal two characters backslash-n.\n\n- BAD:  `B1[Membrane potential\\nintegrates spikes]`\n- GOOD: `B1["Membrane potential<br/>integrates spikes"]`\n\n**Subgraph titles with spaces need an ID plus a quoted display title.** A bare `subgraph My Title` breaks in stricter renderers.\n\n- BAD:  `subgraph Spiking neuron dynamics`\n- GOOD: `subgraph Spiking_neuron_dynamics ["Spiking neuron dynamics"]`\n\n**Quote decision-node (diamond) labels too.** Same rules as `[...]` labels apply to `{...}` shapes.\n\n- BAD:  `B2{Threshold reached?}`\n- GOOD: `B2{"Threshold reached?"}`\n\n**Allowed shapes:** rectangle `A["x"]`, rounded `A("x")`, circle `A(("x"))`, decision/rhombus `A{"x"}`. Pick one consistently per fence; don\'t mix exotic shapes.\n\n**Structural rules every fence must follow:**\n\n- Start with a direction header: `flowchart LR` for process flows, `flowchart TD` for hierarchies or taxonomies.\n- Node IDs are short alphanumerics (`X`, `F1`, `Add`, `H`) \u2014 distinct from labels, no spaces, no punctuation.\n- One statement per line. No semicolons. No trailing whitespace inside labels.\n- No HTML outside quoted labels. No markdown inside labels.\n\n**Self-check before emitting the ` ```mermaid ` block.** Mentally walk every node and edge label and confirm all six:\n\n1. Every multi-word label is wrapped in `"..."`.\n2. Every `&` inside a label is written `&amp;`.\n3. No label contains nested `"`.\n4. Every line break inside a label is `<br/>`, not `\\n`.\n5. Every subgraph whose title contains a space uses the `id ["display title"]` form.\n6. Every `[`, `(`, `{` has a matching close.\n\nIf you cannot satisfy all six, **simplify the labels** (drop the parenthetical sub-text, replace `&` with "and", shorten the phrasing) rather than emit a broken diagram. Do not emit a fence you cannot validate. A working diagram with shortened labels is always better than a broken diagram with the labels you wanted.\n';var wi="**Obsidian MathJax discipline \u2014 Obsidian uses `$$...$$` for block math and `$...$` for inline math, NOT the `\\[...\\]` / `\\(...\\)` form.** Math wrapped in `\\[...\\]` or `\\(...\\)` renders as literal escape sequences, not as a formula.\n\n**Block math** uses `$$...$$`:\n\n- BAD:  `\\[\\text{CAGR} = (V_e / V_b)^{1/n} - 1\\]`\n- GOOD: `$$\\text{CAGR} = (V_e / V_b)^{1/n} - 1$$`\n\n**Inline math** uses `$...$`:\n\n- BAD:  `where \\(n\\) is the number of years`\n- GOOD: `where $n$ is the number of years`\n\n**Escape literal dollar signs as `\\$` in prose.** If you mention a dollar amount anywhere in the document, escape the currency symbol so Obsidian does not pair it with another `$` and try to render the span between as inline math.\n\n- BAD:  `revenue grew from $500,000 to $2.5M`\n- GOOD: `revenue grew from \\$500,000 to \\$2.5M`\n\nThis applies throughout the document, not just near math blocks. Two unescaped `$` characters in the same paragraph will be parsed as an inline-math span no matter how far apart they are.\n";var vi='# Preambles\n\nPlugin-wide text fragments that get prepended (or appended) to every Perplexity request the directory-template feature sends. Unlike templates (per-directory) and partials (per-template, opt-in), preambles apply to **every** request unless a specific template overrides them.\n\n## Wiring\n\nConfigured under "Directory templates" in the Perplexed settings tab:\n\n- **System preambles** (default: `inline-citation`) \u2014 joined with blank lines and prepended to the template\'s own `system:` block before sending to Perplexity.\n- **User preambles** (default: `research-framing` always, `image-placement` when the template sets `return-images: true`) \u2014 `research-framing` wraps the user skeleton; `image-placement` is appended after it.\n\n## Per-template override\n\nA template\'s ```cft fence may override the defaults:\n\n```yaml\npreambles:\n  system: ["inline-citation", "house-rules"]   # replace defaults for this template\n  skip-user: ["research-framing"]              # opt out of one user preamble\n```\n\n## Fallback\n\nIf a preamble file referenced by settings is missing from this folder, the plugin falls back to a bundled default (the original hardcoded text from before this feature shipped). Missing-preamble silence is intentional \u2014 preambles are infrastructure, not content. Check the console for a `console.warn` if you suspect drift.\n\n## Authoring\n\nPreambles support the same `{{basename}}` / `{{title}}` / `{{frontmatter}}` / `{{today}}` / `{{frontmatter.X}}` tokens as templates, and may also use `{{include: <partial-name>}}` to pull in a shared snippet from the partials folder.\n';var $n=`When you make any factual claim that comes from a web search result, append a numeric citation marker like [1], [2], etc. immediately after the claim. The numbers MUST correspond 1:1 to the order of the search results returned by the search tool (first result = [1], second = [2], and so on). You may cite the same source multiple times. Do not list the sources at the end \u2014 only inline markers. Do not invent sources; only cite results actually used.
`;var qn=`IMAGE PLACEMENT \u2014 where an image would clarify or illustrate a section, insert a marker of the form [IMAGE N: <specific description>] on its own line. Numbering starts at 1 and increments globally across all images. Descriptions must be specific (e.g., "ZAPI dashboard showing API discovery interface"), never generic. If the section skeleton already contains an image-placeholder bullet (any line containing the phrase "Image embed placeholder"), REPLACE that bullet entirely with a [IMAGE N: ...] marker \u2014 do not leave the placeholder text in your output. Limit to 2-4 markers across the whole response. Markers will be swapped for real image embeds in post-processing.
`;var Bn=`Research the entity "{{title}}" using web search. Use the metadata below as context, then produce a structured profile that follows the markdown skeleton at the end of this prompt. Every factual claim in your output must be immediately followed by an inline [N] citation marker corresponding to a returned search result. Quote phrasing from sources where useful.

Metadata for "{{title}}":
{{frontmatter}}

Skeleton (follow this structure; bullets under each heading describe what the section requires):

`;var Si={name:"README.md",content:ci},xi=[{name:"concept-profile.md",content:di},{name:"vocabulary-profile.md",content:pi},{name:"source-profile.md",content:ui},{name:"toolkit-profile.md",content:hi},{name:"market-map-profile.md",content:mi},{name:"standards-and-specs-profile.md",content:gi},{name:"market-category-profile.md",content:fi}],Pi={name:"README.md",content:yi},ki=[{name:"mermaid-discipline.md",content:bi},{name:"latex-discipline.md",content:wi}],_i={name:"README.md",content:vi},Ti=[{name:"inline-citation.md",content:$n},{name:"image-placement.md",content:qn},{name:"research-framing.md",content:Bn}],Ei={"inline-citation":$n,"image-placement":qn,"research-framing":Bn};async function Wn(s,e,t){try{await s.vault.create(e,t)}catch(r){let n=r instanceof Error?r.message:String(r);if(!/already exists/i.test(n))throw r}}async function Ai(s,e){let t=(0,ye.normalizePath)(e);if(s.vault.getAbstractFileByPath(t))return;let n=t.split("/").filter(a=>a.length>0),i="";for(let a of n)if(i=i?`${i}/${a}`:a,!s.vault.getAbstractFileByPath(i))try{await s.vault.createFolder(i)}catch(o){let l=o instanceof Error?o.message:String(o);if(!/already exists/i.test(l))throw o}}function Io(s,e){let t=(0,ye.normalizePath)(e),r=s.vault.getAbstractFileByPath(t);return r instanceof ye.TFolder?r.children.some(n=>n.path.endsWith(".md")&&!n.path.endsWith("/README.md")):!1}async function Un(s,e,t,r){let n=(0,ye.normalizePath)(e),i=s.vault.getAbstractFileByPath(n),a=i?Io(s,n):!1;await Ai(s,n);let o=0,l=`${n}/${t.name}`;if(s.vault.getAbstractFileByPath(l)||(await Wn(s,l,t.content),o++),!a)for(let d of r){let p=`${n}/${d.name}`;s.vault.getAbstractFileByPath(p)||(await Wn(s,p,d.content),o++)}let c;return i?a&&o===0?c="skipped":a?c="readme-only":c="empty":c="missing",{seeded:o,reason:c}}async function Ci(s,e,t,r,n={}){let i=n.quiet===!0,a=await Un(s,e,Si,xi),o=a.seeded;if(t&&t.trim().length>0){let l=await Un(s,t,Pi,ki);o+=l.seeded}if(r&&r.trim().length>0){let l=await Un(s,r,_i,Ti);o+=l.seeded}return!i&&o>0&&new ye.Notice(`Perplexed: seeded ${o.toString()} file${o===1?"":"s"}`),{seeded:o,reason:a.reason}}async function Ii(s,e,t,r){let n=0,i=0,a=[{root:e,files:[Si,...xi]}];t&&t.trim().length>0&&a.push({root:t,files:[Pi,...ki]}),r&&r.trim().length>0&&a.push({root:r,files:[_i,...Ti]});for(let{root:o,files:l}of a){let c=(0,ye.normalizePath)(o);await Ai(s,c);for(let d of l){let p=`${c}/${d.name}`;if(s.vault.getAbstractFileByPath(p)){i++;continue}await Wn(s,p,d.content),n++}}return new ye.Notice(`Perplexed: seeded ${n.toString()}, skipped ${i.toString()} (already present)`),{seeded:n,skipped:i}}function jn(s){let{body:e}=zn(s);return e.trimStart()}async function Oi(s,e,t){let r=t.endsWith(".md")?t:`${t}.md`,n=(0,z.normalizePath)(`${e.replace(/\/$/,"")}/${r}`),i=s.vault.getAbstractFileByPath(n);return i instanceof z.TFile?await s.vault.read(i):null}var Gn=/\{\{\s*include:\s*([\w.-]+)\s*\}\}/g,Ri=5;async function en(s,e,t,r=new Set,n=0){if(n>Ri)return e.replace(Gn,(o,l)=>`[[include: ${l} \u2014 max depth ${Ri.toString()} exceeded]]`);let i=new Set;if(e.replace(Gn,(o,l)=>(i.add(l),"")),i.size===0)return e;let a=new Map;for(let o of i){if(r.has(o)){a.set(o,`[[include: ${o} \u2014 cycle detected]]`);continue}let l=t?await Oi(s,t,o):null;if(l===null){a.set(o,`[[include: ${o} \u2014 file not found]]`);continue}let c=jn(l),d=new Set(r);d.add(o);let p=await en(s,c,t,d,n+1);a.set(o,p)}return e.replace(Gn,(o,l)=>a.get(l)??`[[include: ${l} \u2014 unresolved]]`)}async function Ro(s,e,t){if(e){let n=await Oi(s,e,t);if(n!==null)return jn(n)}let r=Ei[t];return r!==void 0?(console.warn(`[perplexed] preamble "${t}" missing from ${e||"(no preamblesRoot)"}; using bundled default`),jn(r)):(console.warn(`[perplexed] preamble "${t}" not found in vault and no bundled default exists`),null)}function Mo(s){let e={skipUser:new Set,skipAll:!1},t=s.preambles;if(!t||typeof t!="object")return e;let r=t;if(r["skip-all"]===!0)return e.skipAll=!0,e;let n=r.system;Array.isArray(n)&&(e.systemOverride=n.filter(a=>typeof a=="string"));let i=r["skip-user"];if(Array.isArray(i))for(let a of i)typeof a=="string"&&e.skipUser.add(a);return e}function No(s){return s.replace(/<think>([\s\S]*?)<\/think>/gi,(e,t)=>"```think-output\n"+t.replace(/^\s+/,"").replace(/\s+$/,"")+"\n```")}function Oo(s,e){if(!e||e.length===0)return{content:s,replaced:0};let t=/!?\[IMAGE\s+(\d+)(?::\s*([^\]]*?))?\](?:\([^)]*\))?/gi,r=0;return{content:s.replace(t,(i,a,o)=>{let l=parseInt(a,10)-1;if(isNaN(l)||l<0||l>=e.length)return i;let c=e[l];if(!c?.image_url)return i;let d=(o??"").trim()||`Image ${(l+1).toString()}`;return r++,`![${d}](${c.image_url})`}),replaced:r}}function Do(s){if(!s||s.length===0)return"";let e=["","# Images",""];return s.forEach((t,r)=>{t.image_url&&(e.push(`![Image ${(r+1).toString()}](${t.image_url})`),t.origin_url&&e.push(`_Source: ${t.origin_url}_`),e.push(""))}),e.join(`
`)}function Lo(s){return s.replace(/^.*Image embed placeholder.*$\n?/gim,"")}function Fo(s){let e=s.map((r,n)=>{let i=n+1,a=typeof r.title=="string"&&r.title?r.title:r.url??"Source",o=r.url??"";return o?`[${i.toString()}]: [${a}](${o})`:`[${i.toString()}]: ${a}`});return`

***

# Sources

`+(e.length>0?e.join(`
`):"_No sources returned._")+`
`}var Mi="---",$o=/^```cft\b\s*$/,qo=/^```\s*$/,Bo=/^\*\*\*\s*$/;function zn(s){let e=s.replace(/\r\n/g,`
`),t=e.split(`
`);if(t[0]!==Mi)return{frontmatter:"",body:e};let r=1;for(;r<t.length&&t[r]!==Mi;)r++;if(r>=t.length)return{frontmatter:"",body:e};let n=t.slice(1,r).join(`
`),i=t.slice(r+1).join(`
`);return{frontmatter:n,body:i}}function Di(s){if(!s.trim())return{};try{let e=(0,z.parseYaml)(s);return e&&typeof e=="object"&&!Array.isArray(e)?e:{}}catch{return{}}}function Uo(s){let e="^",t=0;for(;t<s.length;){let r=s[t]??"";r==="*"&&s[t+1]==="*"?s[t+2]==="/"?(e+="(?:.*/)?",t+=3):(e+=".*",t+=2):r==="*"?(e+="[^/]*",t++):r==="?"?(e+="[^/]",t++):".+^$|(){}[]\\".includes(r)?(e+="\\"+r,t++):(e+=r,t++)}return e+="$",new RegExp(e)}function tn(s,e){return e.length?e.some(t=>Uo(t).test(s)):!1}function Vn(s,e){let t=e.replace(/\/$/,"");if(!t)return[];let r=s.vault.getMarkdownFiles(),n=[];for(let i of r){if(!i.path.startsWith(t+"/"))continue;let o=s.metadataCache.getFileCache(i)?.frontmatter??{},l=o["applies-to-paths"],c=Array.isArray(l)?l.filter(d=>typeof d=="string"):typeof l=="string"?[l]:[];n.push({file:i,frontmatter:o,title:typeof o.title=="string"?o.title:i.basename,description:typeof o.description=="string"?o.description:"",appliesToPaths:c})}return n}async function Kn(s,e){let t=await s.vault.read(e),{body:r}=zn(t),n=r.split(`
`),i=-1;for(let u=0;u<n.length;u++)if($o.test(n[u]??"")){i=u;break}if(i<0)return null;let a=-1;for(let u=i+1;u<n.length;u++)if(qo.test(n[u]??"")){a=u;break}if(a<0)return null;let o=n.slice(i+1,a).join(`
`),l=Di(o),c=typeof l.system=="string"?l.system:"",d={...l};delete d.system;let p=n.length;for(let u=a+1;u<n.length;u++)if(Bo.test(n[u]??"")){p=u;break}let h=n.slice(a+1,p).join(`
`).trim();return{file:e,cftConfig:d,cftSystem:c,userSkeleton:h}}function Wo(s,e){let t={};for(let r of e)r in s&&(t[r]=s[r]);return Object.keys(t).length===0?"(none)":(0,z.stringifyYaml)(t).trim()}function Li(s){return s==null?"":typeof s=="string"?s:typeof s=="number"||typeof s=="boolean"?String(s):Array.isArray(s)?s.map(e=>Li(e)).join(", "):(0,z.stringifyYaml)(s).trim()}function Hn(s,e){return s.replace(/\{\{\s*([\w.-]+)\s*\}\}/g,(t,r)=>{if(r==="title")return e.title;if(r==="frontmatter")return e.frontmatter;if(r==="today")return new Date().toISOString().slice(0,10);if(r==="basename")return e.basename;let n=r.startsWith("frontmatter.")?r.slice(12):r;return n in e.frontmatterObj?Li(e.frontmatterObj[n]):t})}var Go=["-indeed.com","-glassdoor.com","-ziprecruiter.com","-usajobs.gov"],Ho=10;function Fi(s){return(Array.isArray(s)?s:typeof s=="string"?s.split(","):[]).filter(t=>typeof t=="string").map(t=>t.trim()).filter(t=>t.length>0)}function jo(s,e,t,r=[],n){let i=s.cftConfig,a=n&&n.length>0?n:typeof i.model=="string"?i.model:"sonar-pro",o=typeof i["search-recency"]=="string"?i["search-recency"]:void 0,l=i["return-citations"]!==!1,c=i["return-images"]===!0,d={model:a,messages:[{role:"system",content:e},{role:"user",content:t}],stream:!1,return_citations:l,return_images:c,return_related_questions:!1};o&&(d.search_recency_filter=o);let p=[...Fi(i["search-domains"]),...r],u=p.some(T=>!T.startsWith("-"))?p:[...p,...Go],f=[...new Set(u)].slice(0,Ho);f.length>0&&(d.search_domain_filter=f);let v=i["max-tokens"],S=typeof v=="number"?v:typeof v=="string"?parseInt(v,10):NaN;return Number.isFinite(S)&&S>0&&(d.max_tokens=S),d}async function zo(s,e,t,r,n,i,a,o){r.stream=!0;let l=new AbortController,c=Number.isFinite(n.ceilingMs)&&n.ceilingMs>0?activeWindow.setTimeout(()=>l.abort(),n.ceilingMs):null,d;try{let A=new URL(t),C=await new Promise((M,D)=>{let q=Ni.request({hostname:A.hostname,path:A.pathname+A.search,method:"POST",headers:{Authorization:`Bearer ${e}`,"Content-Type":"application/json",Accept:"text/event-stream"},signal:l.signal},B=>{if(B.statusCode!==void 0&&B.statusCode>=400){let N="";B.on("data",U=>{N+=U.toString()}),B.on("end",()=>{D(new Error(`Perplexity HTTP ${String(B.statusCode)} \u2014 ${N}`))});return}M(B)});q.on("error",D),q.write(JSON.stringify(r)),q.end()});d={ok:!0,body:new ReadableStream({start(M){C.on("data",D=>{M.enqueue(D)}),C.on("end",()=>{M.close()}),C.on("error",D=>{M.error(D)})}})}}catch(A){throw c!==null&&activeWindow.clearTimeout(c),A}if(!d.ok)throw c!==null&&activeWindow.clearTimeout(c),new Error(`Perplexity HTTP ${d.status.toString()}`);let p=d.body?.getReader();if(!p)throw c!==null&&activeWindow.clearTimeout(c),new Error("Perplexity returned no response body");let h=n.idleMs,u=()=>{let A,C=new Promise((R,M)=>{A=activeWindow.setTimeout(()=>{M(new Error(`stream went idle for ${(h/1e3).toString()}s (likely API stall, rate limit, or socket close)`))},h)});return Promise.race([p.read(),C]).finally(()=>{A!==void 0&&activeWindow.clearTimeout(A)})},f=new TextDecoder,v="",S="",T=[],I=[],w=!1,y=0,P=500;try{for(;;){if(o()){l.abort();break}let A,C=!1;try{({value:A,done:C}=await u())}catch{w=!0;break}if(C)break;v+=f.decode(A,{stream:!0});let R=v.split(`
`);v=R.pop()??"";for(let D of R){let q=D.trim();if(!q.startsWith("data:"))continue;let B=q.slice(5).trim();if(!(!B||B==="[DONE]"))try{let N=JSON.parse(B);if(typeof N!="object"||N===null)continue;let U=N,F=U.choices;if(Array.isArray(F)&&F.length>0){let Z=F[0],Q=Z?.message,Y=Z?.delta,oe=Q?.content,pe=Y?.content;typeof oe=="string"&&oe.length>S.length&&oe.startsWith(S)?S=oe:typeof pe=="string"&&(S+=pe)}let ae=U.search_results;Array.isArray(ae)&&(T=ae.filter(Z=>typeof Z=="object"&&Z!==null));let de=U.images;Array.isArray(de)&&(I=de.filter(Z=>typeof Z=="object"&&Z!==null))}catch{}}let M=Date.now();M-y>=P&&(await s.vault.modify(i,a+S),y=M)}}finally{c!==null&&activeWindow.clearTimeout(c);try{p.releaseLock()}catch{}}return await s.vault.modify(i,a+S),{streamed:S,sources:T,images:I,truncated:w}}async function Qn(s,e,t,r,n={}){let i=n.quiet===!0,a=n.isCancelled??(()=>!1);if(!e.perplexityApiKey)return i||new z.Notice("Perplexity API key is not set."),{status:"error",error:"Perplexity API key not set"};if(!r.userSkeleton)return i||new z.Notice("Template has no skeleton (no content below the cft block)."),{status:"error",error:"Template has no skeleton"};let o=await s.vault.read(t),{frontmatter:l,body:c}=zn(o),d=c.replace(/\s+$/,""),p=d.trim().length===0?"fill":"append",h=Di(l),u=typeof h.title=="string"?h.title:t.basename,f=Wo(h,e.frontmatterWhitelist),v={title:u,frontmatter:f,frontmatterObj:h,basename:t.basename},S=await en(s,r.cftSystem,e.partialsRoot),T=await en(s,r.userSkeleton,e.partialsRoot),I=Hn(S,v),w=Hn(T,v),y=Mo(r.cftConfig),P=r.cftConfig["return-images"]===!0;async function A(Q){let Y=await Ro(s,e.preamblesRoot,Q);if(Y===null)return null;let oe=await en(s,Y,e.partialsRoot);return Hn(oe,v)}let C="",R="",M="";if(!y.skipAll){let Q=y.systemOverride??e.systemPreambles,Y=[];for(let Te of Q){let ue=await A(Te);ue&&Y.push(ue.trim())}C=Y.join(`

`);let oe=[],pe=[];for(let Te of e.userPreambles){if(y.skipUser.has(Te.name)||Te.when==="return-images"&&!P)continue;let ue=await A(Te.name);ue&&(Te.name==="research-framing"?oe.push(ue):pe.push(ue))}R=oe.join(`

`),M=pe.length>0?`

`+pe.join(`

`):""}let D=C&&I?`${C}

${I}`:C||I,q=R?`${R}${w}${M}`:`${w}${M}`,B=l.length>0?`---
${l}
---
`:"",N=p==="fill"?`${B}
`:`${B}
${d}

`,U=typeof r.cftConfig.model=="string"?r.cftConfig.model:"",F=n.modelOverride&&n.modelOverride.length>0?n.modelOverride:U||"sonar-pro",ae=Fi(h.cf_search_domains),de=jo(r,D,q,ae,F),Z=null;i||(Z=new z.Notice(`Streaming Perplexity \xB7 ${F}\u2026`,0));try{await s.vault.modify(t,N);let Q=V=>typeof V=="number"?V:typeof V=="string"?parseInt(V,10):NaN,oe=/deep-research/i.test(F)?27e4:9e4,pe=Q(r.cftConfig["stream-idle-timeout-ms"]),Te=Number.isFinite(pe)&&pe>0?pe:oe,ue=Q(r.cftConfig["request-timeout-ms"]),Xn=e.requestTimeoutMs,Ui=Number.isFinite(ue)?ue>0?ue:1/0:Xn>0?Xn:1/0,{streamed:Wi,sources:lr,images:De,truncated:Gi}=await zo(s,e.perplexityApiKey,e.perplexityEndpoint,de,{idleMs:Te,ceilingMs:Ui},t,N,a),cr=typeof r.cftConfig.provider=="string"?r.cftConfig.provider:"unknown",nn=F,Hi=cr.length>0?cr.charAt(0).toUpperCase()+cr.slice(1):cr,ji=new Date().toISOString(),zi=`${Hi} ${nn}`.trim(),Vi=Wi.replace(/^\s+/,"").replace(/\s+$/,""),Qe=No(Vi),Zn="";if(P){let V=Oo(Qe,De);Qe=V.content,Qe=Lo(Qe),console.debug(`[directoryTemplateService] images.length=${De.length.toString()}, markers replaced=${V.replaced.toString()}, model=${nn}`),V.replaced===0&&De.length>0?(Zn=Do(De),i||new z.Notice(`Inserted ${De.length.toString()} image${De.length===1?"":"s"} as a fallback section \u2014 model didn't emit [IMAGE N: \u2026] markers.`)):V.replaced===0&&De.length===0&&console.warn(`[directoryTemplateService] return-images is true but Perplexity returned no images. model=${nn}. Likely an API limitation for this model on this query.`)}let Ki=Fo(lr),Qi=`${N}${Qe}
${Zn}${Ki}`;await s.vault.modify(t,Qi);let Yi=/https:\/\/(?:www\.)?(?:books\.google\.com\/books\?id=[\w-]+|google\.com\/books\/edition\/[^\s)]+)/,es=Qe.match(Yi)?.[0];if(await s.fileManager.processFrontMatter(t,V=>{V.cf_last_run=ji,V.cf_last_run_model=zi,es&&!V.google_books_url&&(V.google_books_url=es)}),!i){Gi&&new z.Notice(`"${t.basename}": stream cut off (timeout or lost connection) \u2014 saved partial content with ${lr.length.toString()} sources. Re-run to complete.`);let V=p==="fill"?"Filled":"Appended to";new z.Notice(`${V} "${t.basename}" using ${r.file.basename} (${lr.length.toString()} sources)`)}return{status:"applied",mode:p,sourceCount:lr.length}}catch(Q){let Y=Q instanceof Error?Q.message:String(Q);return i||new z.Notice(`Perplexity error: ${Y}`),{status:"error",error:Y}}finally{Z&&Z.hide()}}async function $i(s,e,t,r,n,i){let a={appliedFill:0,appliedAppend:0,errored:0,cancelled:!1,errors:[]};for(let o=0;o<t.length;o++){if(i())return a.cancelled=!0,a;let l=t[o];if(!l)continue;n({current:o+1,total:t.length,file:l});let c=await Qn(s,e,l,r,{quiet:!0});c.status==="applied"?c.mode==="fill"?a.appliedFill++:a.appliedAppend++:c.status==="error"&&(a.errored++,a.errors.push({path:l.path,error:c.error}))}return a}function qi(s,e){let t=e.replace(/\/$/,"");return s.vault.getMarkdownFiles().filter(r=>t===""?!0:r.path===t||r.path.startsWith(t+"/"))}var X=require("obsidian");function Yn(s){try{return new URL(s).hostname.replace(/^www\./,"")}catch{return""}}function Vo(s){let e=s.replace(/\r\n/g,`
`).split(`
`);if(e[0]!=="---")return{};let t=1;for(;t<e.length&&e[t]!=="---";)t++;if(t>=e.length)return{};let r=e.slice(1,t).join(`
`);try{let n=(0,X.parseYaml)(r);if(n&&typeof n=="object"&&!Array.isArray(n))return n}catch{}return{}}function Ko(s){return s.replace(/\r\n/g,`
`).split(/\n\s*\n+/).map(e=>e.trim()).filter(e=>e.length>0)}function Qo(s){let e=/\[AFTER\s+(\d+)\]\s*\[IMAGE\s+(\d+):\s*([^\]]+)\]/gi,t=[],r;for(;(r=e.exec(s))!==null;){let n=parseInt(r[1]??"",10),i=parseInt(r[2]??"",10),a=(r[3]??"").trim();!isNaN(n)&&!isNaN(i)&&a&&t.push({paragraphIndex:n,description:a,imageNumber:i})}return t}async function Bi(s,e,t,r){let n=r.getSelection().trim();if(!n){new X.Notice("Select text first to anchor image search.");return}if(!e.perplexityApiKey){new X.Notice("Perplexity API key is not set. Configure it in perplexed settings.");return}let i=Ko(n);if(i.length===0){new X.Notice("Selection has no paragraphs.");return}let a=await s.vault.cachedRead(t),o=Vo(a),l=typeof o.site_name=="string"?o.site_name:typeof o.title=="string"?o.title:t.basename,c=typeof o.url=="string"?o.url:"",d=Yn(c),p=Math.max(1,e.maxImages),h=i.map((S,T)=>`[${(T+1).toString()}] ${S}`).join(`

`),f={model:"sonar",messages:[{role:"user",content:`You are a visual editor. The passage below is divided into ${i.length.toString()} numbered paragraphs. Find up to ${p.toString()} screenshot, product, or feature images that visually illustrate the specific content of this passage.

${d?`You are restricted to images on ${d}. Your search has already been domain-filtered to this site. Do NOT reference images from other domains.`:""} Entity: "${l}"${c?" at "+c:""}.

For each image you select, output one line in this exact form, with no other prose:

[AFTER {paragraph_number}] [IMAGE {n}: <specific description of what the image shows>]

Where paragraph_number is the number of the paragraph the image best illustrates, and n is 1-indexed across your selected images. The description must be specific to the image (e.g., "ZAPI dashboard showing API discovery interface"), not generic. Do not return logos, favicons, or icons. If you cannot find ${p.toString()} on-domain images that genuinely illustrate the passage, return fewer images (or none) \u2014 never substitute generic stock images. Return only the placement lines, one per image, nothing else.

Passage:

${h}`}],stream:!1,return_citations:!1,return_images:!0,return_related_questions:!1};d&&(f.search_domain_filter=[d]);let v=new X.Notice("Searching for images\u2026",0);try{let S=await(0,X.request)({url:e.perplexityEndpoint,method:"POST",headers:{Authorization:`Bearer ${e.perplexityApiKey}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(f)}),T=JSON.parse(S),I=T.choices?.[0]?.message?.content??"",w=T.images??[];if(w.length===0){new X.Notice("No images returned.");return}let y=Qo(I),P=N=>{if(!d)return!0;let U=Yn(N.origin_url??""),F=Yn(N.image_url??"");return U.endsWith(d)||F.endsWith(d)},A=w.filter(P);if(d&&A.length===0){new X.Notice(`No on-domain images found for ${d}. Search did not return images hosted on the entity's site.`);return}let C=A,R=new Map,M=new Set;for(let N of y.slice(0,p)){let U=N.imageNumber-1,F=w[U];if(!F?.image_url||!P(F)||N.paragraphIndex<1||N.paragraphIndex>i.length)continue;let ae=`![${N.description}](${F.image_url})`,de=R.get(N.paragraphIndex)??[];de.push(ae),R.set(N.paragraphIndex,de),M.add(U)}if(R.size===0){let N=C.slice(0,p),U=Math.max(1,Math.ceil(i.length/N.length));N.forEach((F,ae)=>{if(!F.image_url)return;let de=Math.min(i.length,(ae+1)*U),Q=`![${`${l} \u2014 illustration ${(ae+1).toString()}`}](${F.image_url})`,Y=R.get(de)??[];Y.push(Q),R.set(de,Y)})}if(R.size===0){new X.Notice("No usable images returned.");return}let D=[];for(let N=0;N<i.length;N++){D.push(i[N]??"");let U=N+1,F=R.get(U);if(F)for(let ae of F)D.push(ae)}let q=D.join(`

`);r.replaceSelection(q);let B=Array.from(R.values()).reduce((N,U)=>N+U.length,0);new X.Notice(`Embedded ${B.toString()} image${B===1?"":"s"} across ${R.size.toString()} paragraph${R.size===1?"":"s"}.`)}catch(S){let T=S instanceof Error?S.message:String(S);new X.Notice(`Image search failed: ${T}`)}finally{v.hide()}}var It={mySetting:"default",localLLMPath:"http://host.docker.internal:3030/api/search",perplexicaEndpoint:"http://localhost:3030/api/search",perplexityEndpoint:"https://api.perplexity.ai/chat/completions",lmStudioEndpoint:"http://localhost:1234/v1/chat/completions",headerPosition:"top",requestBodyTemplate:`{
  "chatModel": {
    "provider": "ollama",
    "name": "llama3.2:latest"
  },
  "embeddingModel": {
    "provider": "ollama",
    "name": "llama3.2:latest"
  },
  "optimizationMode": "speed",
  "focusMode": "webSearch",
  "query": "What is Perplexica's architecture?",
  "history": [
    {
      "role": "user",
      "content": "What is Perplexica's architecture?"
    }
  ],
  "systemInstructions": "{{PERPLEXICA_SYSTEM_PROMPT}}",
  "stream": false,
  "maxTokens": 2048,
  "temperature": 0.7
}`,perplexityApiKey:"",anthropicApiKey:"",claudeDefaultModel:"claude-opus-4-7",geminiApiKey:"",geminiDefaultModel:"gemini-flash-latest",geminiEnableGrounding:!0,geminiIncludeSearchSuggestions:!0,geminiResolveCitationUrls:!0,perplexityRequestTemplate:`{
  "model": "llama-3.1-sonar-small-128k-online",
  "messages": [
    {
      "role": "system",
      "content": "{{PERPLEXITY_SYSTEM_PROMPT}}"
    },
    {
      "role": "user",
      "content": "What is Perplexity AI's approach to search?"
    }
  ],
  "max_tokens": 2048,
  "temperature": 0.7,
  "top_p": 0.9,
  "return_citations": true,
  "search_domain_filter": [],
  "return_images": false,
  "return_related_questions": false,
  "search_recency_filter": "month",
  "top_k": 0,
  "stream": false,
  "presence_penalty": 0,
  "frequency_penalty": 1
}`,lmStudioRequestTemplate:`{
  "model": "ibm/granite-3.2-8b",
  "messages": [
    {
      "role": "user",
      "content": "Hello, can you help me with this question?"
    }
  ],
  "max_tokens": 2048,
  "temperature": 0.7,
  "stream": false
}`,defaultModel:"llama3.2:latest",defaultOptimizationMode:"speed",defaultFocusMode:"webSearch",defaultLMStudioModel:"ibm/granite-3.2-8b",prompts:{perplexitySystemPrompt:"You are a helpful AI assistant. Provide clear, concise, and accurate information with proper citations.",perplexicaSystemPrompt:"You are a helpful AI assistant. Provide clear, concise, and accurate information.",lmStudioDefaultSystemPrompt:"You are a helpful AI assistant. Provide clear, concise, and accurate information.",perplexityQueryPlaceholder:"What would you like to ask Perplexity?",perplexicaQueryPlaceholder:"What would you like to ask Perplexica / Vane?",lmStudioQueryPlaceholder:"What would you like to ask?",lmStudioSystemPromptPlaceholder:"You are a helpful AI assistant...",articleTermPlaceholder:"e.g., AI Copilots, AI Studios, Machine Learning, etc.",articleGeneratorTemplate:`Write a comprehensive one-page article about "{TERM}". 

Structure the article as follows:

1. **Introduction** (2-3 sentences)
   - Define the term and its significance
   - Provide context for why it matters

2. **Main Content** (3-4 paragraphs)
   - Explain the concept in detail
   - Include practical examples and use cases
   - Discuss benefits and potential applications
   - Address any challenges or considerations

3. **Current State and Trends** (1-2 paragraphs)
   - Discuss current adoption and market status
   - Mention key players or technologies
   - Highlight recent developments

4. **Future Outlook** (1 paragraph)
   - Predict future developments
   - Discuss potential impact

5. **Conclusion** (1-2 sentences)
   - Summarize key points
   - End with a forward-looking statement

**Important Guidelines:**
- Keep the total length to approximately one page (500-800 words)
- Use clear, accessible language
- Include specific examples and real-world applications
- Make it engaging and informative for a general audience
- Use markdown formatting for structure`,deepResearchArticleTemplate:`Conduct comprehensive research and write an in-depth article about "{TERM}". 

**Research Requirements:**
- Conduct exhaustive research across hundreds of sources
- Analyze multiple perspectives and viewpoints
- Include academic, industry, and expert sources
- Provide detailed citations and references
- Examine historical context and evolution
- Consider global implications and regional variations

**Article Structure:**

1. **Executive Summary** (1 paragraph)
   - Concise overview of key findings
   - Main conclusions and implications

2. **Introduction and Definition** (2-3 paragraphs)
   - Comprehensive definition and scope
   - Historical context and evolution
   - Current significance and relevance

3. **Comprehensive Analysis** (6-8 paragraphs)
   - Detailed examination of core concepts
   - Multiple perspectives and approaches
   - Industry applications and use cases
   - Technical implementation details
   - Market analysis and competitive landscape
   - Regulatory and ethical considerations

4. **Current State and Market Dynamics** (3-4 paragraphs)
   - Global adoption patterns and trends
   - Key players, technologies, and platforms
   - Regional variations and cultural factors
   - Economic impact and market size
   - Recent developments and breakthroughs

5. **Challenges and Opportunities** (2-3 paragraphs)
   - Technical challenges and limitations
   - Implementation barriers and solutions
   - Future opportunities and potential
   - Risk factors and mitigation strategies

6. **Future Outlook and Predictions** (2-3 paragraphs)
   - Short-term developments (1-2 years)
   - Medium-term trends (3-5 years)
   - Long-term implications (5+ years)
   - Strategic recommendations

7. **Conclusion** (1-2 paragraphs)
   - Synthesis of key findings
   - Strategic implications
   - Call to action or forward-looking statement

**Research Guidelines:**
- Include diverse source types (academic, industry, news, expert opinions)
- Provide detailed citations for all claims
- Analyze conflicting viewpoints and evidence
- Consider global and regional perspectives
- Include quantitative data where available
- Examine both benefits and risks
- Address ethical and societal implications

**Quality Standards:**
- Academic rigor with practical relevance
- Balanced analysis of multiple perspectives
- Evidence-based conclusions
- Clear, professional writing style
- Comprehensive bibliography`,imageReferencesPrompt:`**Image References:**
Please include the following image references throughout your response where appropriate:
- [IMAGE 1: Relevant diagram or illustration related to the topic]
- [IMAGE 2: Practical example or use case visualization]
- [IMAGE 3: Additional supporting visual content]`,enhancePrompt:`Please enhance the following text by improving clarity, adding relevant details, expanding on key points, and making it more comprehensive and engaging. Maintain the original meaning and tone while making it more informative and well-structured:

{TEXT}`,enhanceWithImagesPrompt:`Please provide 1-3 relevant images for the following text. Return ONLY the image markers in the format [IMAGE 1: description], [IMAGE 2: description], etc. Each image should illustrate a key concept, example, or visual representation related to the text. Do not include any other text or explanation:

{TEXT}`},directoryTemplatesRoot:"zz-cf-lib/templates",directoryTemplatesPartialsRoot:"zz-cf-lib/partials",directoryTemplatesPreamblesRoot:"zz-cf-lib/preambles",directoryTemplatesSystemPreambles:["inline-citation"],directoryTemplatesUserPreambles:[{name:"research-framing",when:"always"},{name:"image-placement",when:"return-images"}],directoryTemplatesFrontmatterWhitelist:["title","og_description","tags","og_image"],directoryTemplatesRequestTimeoutMs:18e5,findImagesMaxImages:3},rn=class extends g.Plugin{settings=It;statusBarItemEl=null;ribbonIconEl=null;batchCancelled=!1;perplexityService;perplexicaService;lmStudioService;claudeService;geminiService;promptsService;async onload(){try{console.debug("Perplexed Plugin: Starting initialization..."),await this.loadSettings(),console.debug("Perplexed Plugin: Settings loaded successfully");try{let e=await Ci(this.app,this.settings.directoryTemplatesRoot,this.settings.directoryTemplatesPartialsRoot,this.settings.directoryTemplatesPreamblesRoot);e.seeded>0&&console.debug(`Perplexed Plugin: seeded ${e.seeded.toString()} template(s) (${e.reason})`)}catch(e){console.error("Perplexed Plugin: template seeding failed:",e)}try{this.promptsService=new ar(this.settings.prompts),console.debug("Perplexed Plugin: PromptsService initialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to initialize PromptsService:",e),new g.Notice("Failed to initialize promptsservice"),this.promptsService=null}if(this.promptsService){try{this.perplexityService=new Mt({perplexityApiKey:this.settings.perplexityApiKey,perplexityEndpoint:this.settings.perplexityEndpoint,promptsService:this.promptsService,requestTemplate:this.settings.perplexityRequestTemplate,headerPosition:this.settings.headerPosition}),console.debug("Perplexed Plugin: PerplexityService initialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to initialize PerplexityService:",e),new g.Notice("Failed to initialize perplexityservice"),this.perplexityService=null}try{this.perplexicaService=new Nt({perplexicaEndpoint:this.settings.perplexicaEndpoint,localLLMPath:this.settings.localLLMPath,defaultModel:this.settings.defaultModel,promptsService:this.promptsService,requestTemplate:this.settings.requestBodyTemplate}),console.debug("Perplexed Plugin: PerplexicaService initialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to initialize PerplexicaService:",e),new g.Notice("Failed to initialize perplexicaservice"),this.perplexicaService=null}try{this.lmStudioService=new Ot({lmStudioEndpoint:this.settings.lmStudioEndpoint,promptsService:this.promptsService,requestTemplate:this.settings.lmStudioRequestTemplate}),console.debug("Perplexed Plugin: LMStudioService initialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to initialize LMStudioService:",e),new g.Notice("Failed to initialize lmstudioservice"),this.lmStudioService=null}try{this.claudeService=new sr({anthropicApiKey:this.settings.anthropicApiKey,promptsService:this.promptsService,headerPosition:this.settings.headerPosition}),console.debug("Perplexed Plugin: ClaudeService initialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to initialize ClaudeService:",e),new g.Notice("Failed to initialize claudeservice"),this.claudeService=null}try{this.geminiService=new ir({geminiApiKey:this.settings.geminiApiKey,promptsService:this.promptsService,headerPosition:this.settings.headerPosition}),console.debug("Perplexed Plugin: GeminiService initialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to initialize GeminiService:",e),new g.Notice("Failed to initialize geminiservice"),this.geminiService=null}}else this.perplexityService=null,this.perplexicaService=null,this.lmStudioService=null,this.claudeService=null,this.geminiService=null,console.debug("Perplexed Plugin: Skipping service initialization due to PromptsService failure");console.debug("Perplexed Plugin: Current Perplexica Path:",this.settings.perplexicaEndpoint),console.debug("Perplexed Plugin: Full settings:",JSON.stringify(this.settings,null,2)),this.addSettingTab(new Jn(this.app,this)),console.debug("Perplexed Plugin: Settings tab added successfully");try{this.registerPerplexicaCommands(),console.debug("Perplexed Plugin: Perplexica commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register Perplexica commands:",e)}try{this.registerPerplexityCommands(),console.debug("Perplexed Plugin: Perplexity commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register Perplexity commands:",e)}try{this.registerLMStudioCommands(),console.debug("Perplexed Plugin: LM Studio commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register LM Studio commands:",e)}try{this.registerClaudeCommands(),console.debug("Perplexed Plugin: Claude commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register Claude commands:",e)}try{this.registerGeminiCommands(),console.debug("Perplexed Plugin: Gemini commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register Gemini commands:",e)}try{this.registerArticleGeneratorCommands(),console.debug("Perplexed Plugin: Article generator commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register article generator commands:",e)}try{this.registerTextEnhancementCommands(),console.debug("Perplexed Plugin: Text enhancement commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register text enhancement commands:",e)}try{this.registerTextEnhancementWithImagesCommands(),console.debug("Perplexed Plugin: Get related images commands registered successfully")}catch(e){console.error("Perplexed Plugin: Failed to register get related images commands:",e)}this.addCommand({id:"debug-status",name:"Debug: log registered actions",callback:()=>{this.debugCommands()}}),this.addCommand({id:"reset-prompts",name:"Reset prompts to default",callback:async()=>{await this.resetPromptsToDefault()}}),this.addCommand({id:"reinitialize-services",name:"Reinitialize provider services",callback:()=>{this.reinitializeServices()}}),this.addCommand({id:"apply-directory-template-to-current-file",name:"Apply directory template to current file",callback:async()=>{await this.runApplyDirectoryTemplate()}}),this.addCommand({id:"apply-directory-template-to-folder",name:"Apply directory template to all files in folder",callback:()=>{this.runApplyDirectoryTemplateBatch()}}),this.addCommand({id:"stop-directory-template-batch",name:"Stop directory template batch",callback:()=>{this.batchCancelled=!0,new g.Notice("Stop requested \u2014 finishing current file then halting.")}}),this.addCommand({id:"find-images-for-selection",name:"Find images for selection",editorCallback:e=>{let t=this.app.workspace.getActiveFile();if(!t){new g.Notice("No active file.");return}let r={perplexityApiKey:this.settings.perplexityApiKey,perplexityEndpoint:this.settings.perplexityEndpoint,maxImages:this.settings.findImagesMaxImages};Bi(this.app,r,t,e)}}),console.debug("Perplexed Plugin: Initialization completed successfully"),new g.Notice("Perplexed plugin loaded successfully")}catch(e){console.error("Perplexed Plugin: Critical initialization error:",e),new g.Notice("Perplexed plugin failed to load properly")}}onunload(){this.statusBarItemEl?.remove(),this.ribbonIconEl?.remove()}async loadSettings(){let e=await this.loadData()??{};this.settings=Object.assign({},It,e),this.settings.prompts.deepResearchArticleTemplate||(this.settings.prompts.deepResearchArticleTemplate=It.prompts.deepResearchArticleTemplate,await this.saveSettings()),this.settings.prompts.enhancePrompt||(this.settings.prompts.enhancePrompt=It.prompts.enhancePrompt,await this.saveSettings()),this.settings.prompts.enhanceWithImagesPrompt||(this.settings.prompts.enhanceWithImagesPrompt=It.prompts.enhanceWithImagesPrompt,await this.saveSettings())}async saveSettings(){try{await this.saveData(this.settings)}catch(e){console.error("Failed to save settings:",e),new g.Notice("Failed to save settings")}}async queryPerplexity(e,t,r,n,i){if(!this.perplexityService)throw new Error("Perplexity service not initialized");await this.perplexityService.queryPerplexity(e,t,r,n,i)}async queryPerplexica(e,t,r,n,i,a){if(!this.perplexicaService)throw new Error("Perplexica service not initialized");await this.perplexicaService.queryPerplexica(e,t,r,n,i,a)}async queryLMStudio(e,t,r,n,i){if(!this.lmStudioService)throw new Error("LM Studio service not initialized");await this.lmStudioService.queryLMStudio(e,t,r,n,i)}getPromptsService(){return this.promptsService}registerPerplexicaCommands(){this.addCommand({id:"update-perplexica-url",name:"Update perplexica / vane URL",callback:()=>{new Et(this.app,{title:"Update Perplexica / Vane API URL",label:"Perplexica / Vane API URL",placeholder:"http://localhost:3030/api/search",currentValue:this.settings.perplexicaEndpoint,onSave:async t=>{this.settings.perplexicaEndpoint=t,await this.saveSettings()}}).open()}}),this.addCommand({id:"show-perplexica-settings",name:"Show perplexica / vane settings",callback:()=>{new g.Notice(`Current Perplexica / Vane URL: ${this.settings.perplexicaEndpoint}`),console.debug("Perplexica Settings:",this.settings)}}),this.addCommand({id:"ask-perplexica",name:"Ask perplexica / vane",editorCallback:e=>{try{if(!this.perplexicaService){new g.Notice("Perplexica / vane service not initialized. Please check console for errors and try the debug command."),console.error("Perplexica service is not initialized");return}if(!this.promptsService){new g.Notice("Prompts service not initialized. Please check console for errors and try the debug command."),console.error("Prompts service is not initialized");return}new Ur(this.app,e,this.perplexicaService,this.promptsService).open()}catch(t){console.error("Error opening Perplexica modal:",t),new g.Notice("Failed to open perplexica / vane modal. Check console for details.")}}})}registerPerplexityCommands(){try{this.addCommand({id:"update-perplexity-url",name:"Update perplexity URL",callback:()=>{new Et(this.app,{title:"Update Perplexity API URL",label:"Perplexity API URL",placeholder:"https://api.perplexity.ai/chat/completions",currentValue:this.settings.perplexityEndpoint,onSave:async t=>{this.settings.perplexityEndpoint=t,await this.saveSettings()}}).open()}}),this.addCommand({id:"show-perplexity-settings",name:"Show perplexity settings",callback:()=>{new g.Notice(`Current Perplexity URL: ${this.settings.perplexityEndpoint}`),console.debug("Perplexity Settings:",this.settings)}}),this.addCommand({id:"ask-perplexity",name:"Ask perplexity",editorCallback:e=>{try{if(!this.perplexityService){new g.Notice("Perplexity service not initialized. Please check console for errors and try the debug command."),console.error("Perplexity service is not initialized");return}if(!this.promptsService){new g.Notice("Prompts service not initialized. Please check console for errors and try the debug command."),console.error("Prompts service is not initialized");return}new Br(this.app,e,this.perplexityService,this.promptsService).open()}catch(t){console.error("Error opening Perplexity modal:",t),new g.Notice("Failed to open perplexity modal. Check console for details.")}}}),this.addCommand({id:"perplexity-service-status",name:"Check perplexity service status",callback:()=>{this.perplexityService?(new g.Notice("Perplexity service is initialized and ready"),console.debug("Perplexity service status: OK")):(new g.Notice("Perplexity service is not initialized. Check console for errors."),console.error("Perplexity service status: FAILED"))}}),console.debug("Perplexed Plugin: Perplexity commands registered successfully")}catch(e){throw console.error("Perplexed Plugin: Error registering Perplexity commands:",e),e}}registerGeminiCommands(){this.addCommand({id:"ask-gemini",name:"Ask Gemini",editorCallback:e=>{if(!this.geminiService){new g.Notice("Gemini service not initialized. Set GEMINI_API_KEY in .env or settings, then reinitialize services.");return}if(!this.promptsService){new g.Notice("Prompts service not initialized.");return}new Hr(this.app,e,this.geminiService,this.promptsService,{defaultModel:this.settings.geminiDefaultModel,enableGrounding:this.settings.geminiEnableGrounding,includeSearchSuggestions:this.settings.geminiIncludeSearchSuggestions,resolveCitationUrls:this.settings.geminiResolveCitationUrls}).open()}}),this.addCommand({id:"gemini-service-status",name:"Check Gemini service status",callback:()=>{this.geminiService&&this.settings.geminiApiKey?new g.Notice("Gemini service is initialized and an API key is configured."):this.geminiService?new g.Notice("Gemini service is initialized but no API key is set."):new g.Notice("Gemini service is not initialized.")}})}registerClaudeCommands(){this.addCommand({id:"ask-claude",name:"Ask Claude",editorCallback:e=>{if(!this.claudeService){new g.Notice("Claude service not initialized. Set ANTHROPIC_API_KEY in .env or settings, then reinitialize services.");return}if(!this.promptsService){new g.Notice("Prompts service not initialized.");return}new Gr(this.app,e,this.claudeService,this.promptsService).open()}}),this.addCommand({id:"claude-service-status",name:"Check Claude service status",callback:()=>{this.claudeService&&this.settings.anthropicApiKey?new g.Notice("Claude service is initialized and an API key is configured."):this.claudeService?new g.Notice("Claude service is initialized but no API key is set."):new g.Notice("Claude service is not initialized.")}})}registerLMStudioCommands(){this.addCommand({id:"update-lmstudio-url",name:"Update lm studio URL",callback:()=>{new Et(this.app,{title:"Update LM Studio API URL",label:"LM Studio API URL",placeholder:"http://localhost:1234/v1/chat/completions",currentValue:this.settings.lmStudioEndpoint,onSave:async t=>{this.settings.lmStudioEndpoint=t,await this.saveSettings()}}).open()}}),this.addCommand({id:"show-lmstudio-settings",name:"Show lm studio settings",callback:()=>{new g.Notice(`Current LM Studio URL: ${this.settings.lmStudioEndpoint}`),console.debug("LM Studio Settings:",this.settings)}}),this.addCommand({id:"ask-lmstudio",name:"Ask lm studio",editorCallback:e=>{try{if(!this.lmStudioService){new g.Notice("Lm studio service not initialized. Please check console for errors and try the debug command."),console.error("LM Studio service is not initialized");return}if(!this.promptsService){new g.Notice("Prompts service not initialized. Please check console for errors and try the debug command."),console.error("Prompts service is not initialized");return}new Wr(this.app,e,this.lmStudioService,this.promptsService).open()}catch(t){console.error("Error opening LM Studio modal:",t),new g.Notice("Failed to open lm studio modal. Check console for details.")}}})}registerArticleGeneratorCommands(){this.addCommand({id:"generate-article",name:"Generate one-page article",editorCallback:e=>{try{if(!this.perplexityService){new g.Notice("Perplexity service not initialized. Please check console for errors and try the debug command."),console.error("Perplexity service is not initialized");return}if(!this.promptsService){new g.Notice("Prompts service not initialized. Please check console for errors and try the debug command."),console.error("Prompts service is not initialized");return}new jr(this.app,e,this.perplexityService,this.promptsService).open()}catch(t){console.error("Error opening Article Generator modal:",t),new g.Notice("Failed to open article generator modal. Check console for details.")}}})}registerTextEnhancementCommands(){this.addCommand({id:"enhance-text",name:"Enhance selected text with perplexity",editorCallback:e=>{try{let t=e.getSelection();if(!t||t.trim()===""){new g.Notice("Please select some text to enhance");return}if(!this.perplexityService){new g.Notice("Perplexity service not initialized. Please check console for errors and try the debug command."),console.error("Perplexity service is not initialized");return}if(!this.promptsService){new g.Notice("Prompts service not initialized. Please check console for errors and try the debug command."),console.error("Prompts service is not initialized");return}new zr(this.app,e,this.perplexityService,this.promptsService,t).open()}catch(t){console.error("Error opening Text Enhancement modal:",t),new g.Notice("Failed to open text enhancement modal. Check console for details.")}}})}registerTextEnhancementWithImagesCommands(){this.addCommand({id:"enhance-text-with-images",name:"Get related images for selected text",editorCallback:e=>{try{let t=e.getSelection();if(!t||t.trim()===""){new g.Notice("Please select some text to get related images for");return}if(!this.perplexityService){new g.Notice("Perplexity service not initialized. Please check console for errors and try the debug command."),console.error("Perplexity service is not initialized");return}if(!this.promptsService){new g.Notice("Prompts service not initialized. Please check console for errors and try the debug command."),console.error("Prompts service is not initialized");return}new Vr(this.app,e,this.perplexityService,this.promptsService,t).open()}catch(t){console.error("Error opening Get Related Images modal:",t),new g.Notice("Failed to open get related images modal. Check console for details.")}}})}debugCommands(){console.debug("=== Perplexed Plugin Debug Information ==="),console.debug("Plugin instance:",this),console.debug("Settings:",this.settings),console.debug("Services status:"),console.debug("- PromptsService:",this.promptsService?"Initialized":"NOT INITIALIZED"),console.debug("- PerplexityService:",this.perplexityService?"Initialized":"NOT INITIALIZED"),console.debug("- PerplexicaService:",this.perplexicaService?"Initialized":"NOT INITIALIZED"),console.debug("- LMStudioService:",this.lmStudioService?"Initialized":"NOT INITIALIZED");let e=this.app.commands.commands,t=Object.keys(e).filter(r=>r.startsWith("perplexed")||r.includes("perplexity")||r.includes("perplexica")||r.includes("lmstudio")||r.includes("generate-article")||r.includes("enhance-text"));console.debug("Registered Perplexed commands:",t),t.length===0?new g.Notice("No perplexed commands found! Check console for details."):new g.Notice(`Found ${t.length} Perplexed commands. Check console for details.`),console.debug("=== End Debug Information ===")}async resetPromptsToDefault(){try{console.debug("Perplexed Plugin: Resetting prompts to default..."),new g.Notice("Resetting prompts to default values..."),this.settings.prompts={...It.prompts},await this.saveSettings(),this.promptsService&&(this.promptsService.updateSettings(this.settings.prompts),console.debug("Perplexed Plugin: PromptsService updated with default settings")),new g.Notice("\u2705 Prompts reset to default values successfully"),console.debug("Perplexed Plugin: Prompts reset to default successfully")}catch(e){console.error("Perplexed Plugin: Failed to reset prompts to default:",e),new g.Notice("\u274C Failed to reset prompts to default. Check console for details.")}}reinitializeServices(){try{console.debug("Perplexed Plugin: Reinitializing services..."),new g.Notice("Reinitializing perplexed services...");try{this.promptsService=new ar(this.settings.prompts),console.debug("Perplexed Plugin: PromptsService reinitialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to reinitialize PromptsService:",e),this.promptsService=null}if(this.promptsService){try{this.perplexityService=new Mt({perplexityApiKey:this.settings.perplexityApiKey,perplexityEndpoint:this.settings.perplexityEndpoint,promptsService:this.promptsService,requestTemplate:this.settings.perplexityRequestTemplate,headerPosition:this.settings.headerPosition}),console.debug("Perplexed Plugin: PerplexityService reinitialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to reinitialize PerplexityService:",e),this.perplexityService=null}try{this.perplexicaService=new Nt({perplexicaEndpoint:this.settings.perplexicaEndpoint,localLLMPath:this.settings.localLLMPath,defaultModel:this.settings.defaultModel,promptsService:this.promptsService,requestTemplate:this.settings.requestBodyTemplate}),console.debug("Perplexed Plugin: PerplexicaService reinitialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to reinitialize PerplexicaService:",e),this.perplexicaService=null}try{this.lmStudioService=new Ot({lmStudioEndpoint:this.settings.lmStudioEndpoint,promptsService:this.promptsService,requestTemplate:this.settings.lmStudioRequestTemplate}),console.debug("Perplexed Plugin: LMStudioService reinitialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to reinitialize LMStudioService:",e),this.lmStudioService=null}try{this.claudeService=new sr({anthropicApiKey:this.settings.anthropicApiKey,promptsService:this.promptsService,headerPosition:this.settings.headerPosition}),console.debug("Perplexed Plugin: ClaudeService reinitialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to reinitialize ClaudeService:",e),this.claudeService=null}try{this.geminiService=new ir({geminiApiKey:this.settings.geminiApiKey,promptsService:this.promptsService,headerPosition:this.settings.headerPosition}),console.debug("Perplexed Plugin: GeminiService reinitialized successfully")}catch(e){console.error("Perplexed Plugin: Failed to reinitialize GeminiService:",e),this.geminiService=null}}else this.perplexityService=null,this.perplexicaService=null,this.lmStudioService=null,this.claudeService=null,this.geminiService=null,console.debug("Perplexed Plugin: Skipping service reinitialization due to PromptsService failure");new g.Notice("Services reinitialization completed. Check console for details."),console.debug("Perplexed Plugin: Services reinitialization completed")}catch(e){console.error("Perplexed Plugin: Error during services reinitialization:",e),new g.Notice("Failed to reinitialize services. Check console for details.")}}buildDirectoryTemplateSettings(){return{perplexityApiKey:this.settings.perplexityApiKey,perplexityEndpoint:this.settings.perplexityEndpoint,templatesRoot:this.settings.directoryTemplatesRoot,partialsRoot:this.settings.directoryTemplatesPartialsRoot,preamblesRoot:this.settings.directoryTemplatesPreamblesRoot,systemPreambles:this.settings.directoryTemplatesSystemPreambles,userPreambles:this.settings.directoryTemplatesUserPreambles,frontmatterWhitelist:this.settings.directoryTemplatesFrontmatterWhitelist,requestTimeoutMs:this.settings.directoryTemplatesRequestTimeoutMs}}async runApplyDirectoryTemplate(){let e=this.app.workspace.getActiveFile();if(!e){new g.Notice("No active file.");return}if(!this.settings.perplexityApiKey){new g.Notice("Perplexity API key is not set. Configure it in perplexed settings.");return}let t=this.settings.directoryTemplatesRoot,r=Vn(this.app,t);if(r.length===0){new g.Notice(`No templates found under "${t}".`);return}let n=r.filter(o=>tn(e.path,o.appliesToPaths));if(n.length===0){new g.Notice("No template's applies-to-paths matches this file.");return}let i=this.buildDirectoryTemplateSettings(),a=[];for(let o of n){let l=await Kn(this.app,o.file);l&&a.push({template:l,title:o.title})}if(a.length===0){new g.Notice("Template parse error: missing or malformed cft block.");return}new Qr(this.app,a,(o,l)=>{Qn(this.app,i,e,o,{modelOverride:l})}).open()}runApplyDirectoryTemplateBatch(){if(!this.settings.perplexityApiKey){new g.Notice("Perplexity API key is not set. Configure it in perplexed settings.");return}new Yr(this.app,e=>{(async()=>{let t=e.path,r=qi(this.app,t);if(r.length===0){new g.Notice(`No markdown files in "${t||"/"}".`);return}let i=Vn(this.app,this.settings.directoryTemplatesRoot).filter(a=>r.some(o=>tn(o.path,a.appliesToPaths)));if(i.length===0){new g.Notice("No template matches any file in this folder.");return}new Kr(this.app,i,a=>{(async()=>{let o=await Kn(this.app,a.file);if(!o){new g.Notice("Template parse error: missing or malformed cft block.");return}let l=r.filter(h=>tn(h.path,a.appliesToPaths)),c=0,d=0;for(let h of l)(await this.app.vault.cachedRead(h)).replace(/^---\n[\s\S]*?\n---\n?/,"").trim().length===0?c++:d++;let p=this.buildDirectoryTemplateSettings();new Xr(this.app,{folderPath:t,templateTitle:a.title,fileCount:l.length,fillCount:c,appendCount:d},()=>{this.executeBatch(p,o,l)}).open()})()}).open()})()}).open()}async executeBatch(e,t,r){this.batchCancelled=!1;let n=new g.Notice(`Batch starting on ${r.length.toString()} files\u2026`,0);try{let i=await $i(this.app,e,r,t,o=>{n.setMessage(`Applying ${o.current.toString()}/${o.total.toString()}: ${o.file.basename}`)},()=>this.batchCancelled),a=[`Batch ${i.cancelled?"cancelled":"complete"}.`,`Filled: ${i.appliedFill.toString()}`,`Appended: ${i.appliedAppend.toString()}`,`Errored: ${i.errored.toString()}`].join(" ");new g.Notice(a,8e3),i.errors.length>0&&console.warn("Directory-template batch errors:",i.errors)}catch(i){let a=i instanceof Error?i.message:String(i);new g.Notice(`Batch failed: ${a}`)}finally{n.hide(),this.batchCancelled=!1}}},Jn=class extends g.PluginSettingTab{plugin;constructor(e,t){super(e,t),this.plugin=t}updatePromptsService(){let e=this.plugin.getPromptsService();e&&e.updateSettings(this.plugin.settings.prompts)}display(){let{containerEl:e}=this;e.empty(),new g.Setting(e).setName("Perplexity (remote service)").setHeading(),e.createEl("p",{text:"Configure settings for the hosted perplexity AI service",cls:"setting-item-description"}),new g.Setting(e).setName("Endpoint").setDesc("API endpoint for perplexity service").addText(w=>w.setPlaceholder("HTTPS://api.perplexity.ai/chat/completions").setValue(this.plugin.settings.perplexityEndpoint).onChange(async y=>{this.plugin.settings.perplexityEndpoint=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("API key").setDesc("Your perplexity API key (required for remote service)").addText(w=>w.setPlaceholder("Pplx-xxxxxxxxxxxxxxxxxxxxx").setValue(this.plugin.settings.perplexityApiKey).onChange(async y=>{this.plugin.settings.perplexityApiKey=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Header position").setDesc("Where to place the query header in generated articles").addDropdown(w=>w.addOption("top","Top of article").addOption("bottom","Bottom of article").setValue(this.plugin.settings.headerPosition).onChange(async y=>{this.plugin.settings.headerPosition=y,await this.plugin.saveSettings()}));let t=new g.Setting(e).setName("Request body template").setDesc("JSON template for perplexity API requests"),r=e.createEl("textarea");if(r.rows=10,r.cols=50,r.addClass("perplexed-json-textarea"),r.placeholder="Enter perplexity JSON request template...",this.plugin.settings.perplexityRequestTemplate)try{let w=JSON.parse(this.plugin.settings.perplexityRequestTemplate);r.value=JSON.stringify(w,null,2)}catch{r.value=this.plugin.settings.perplexityRequestTemplate}r.addEventListener("input",()=>{(async()=>{this.plugin.settings.perplexityRequestTemplate=r.value,await this.plugin.saveSettings()})()}),t.settingEl.appendChild(r),new g.Setting(e).setName("Claude (Anthropic)").setHeading(),e.createEl("p",{text:"Configure Claude API access. Web-search citations supported in this iteration; document-grounded citations are deferred.",cls:"setting-item-description"}),new g.Setting(e).setName("Anthropic API key").setDesc("Your Anthropic API key. Read from ANTHROPIC_API_KEY in .env if set; can be overridden here.").addText(w=>w.setPlaceholder("Sk-ant-...").setValue(this.plugin.settings.anthropicApiKey).onChange(async y=>{this.plugin.settings.anthropicApiKey=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Default Claude model").setDesc("Default model used by the ask Claude command. Recommended: Claude-opus-4-7.").addDropdown(w=>w.addOption("claude-opus-4-7","Claude-opus-4-7 (recommended)").addOption("claude-opus-4-6","Claude-opus-4-6").addOption("claude-sonnet-4-6","Claude-sonnet-4-6").addOption("claude-haiku-4-5","Claude-haiku-4-5").setValue(this.plugin.settings.claudeDefaultModel).onChange(async y=>{this.plugin.settings.claudeDefaultModel=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Gemini (Google)").setHeading(),e.createEl("p",{text:"Configure Gemini API access. The Google_search tool emits per-segment grounding supports that map text spans to source urls \u2014 the per-claim attribution Claude's dynamic-filter pass loses.",cls:"setting-item-description"}),new g.Setting(e).setName("Gemini API key").setDesc("Your Google AI studio API key. Generate one in Google AI studio.").addText(w=>w.setPlaceholder("Aiza...").setValue(this.plugin.settings.geminiApiKey).onChange(async y=>{this.plugin.settings.geminiApiKey=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Default Gemini model").setDesc("Default model used by the ask Gemini command. Recommended: Gemini flash (latest) \u2014 free-tier friendly.").addDropdown(w=>w.addOption("gemini-flash-latest","Gemini flash (latest) \u2014 recommended").addOption("gemini-pro-latest","Gemini pro (latest)").addOption("gemini-2.5-pro","Gemini 2.5 pro (pinned)").addOption("gemini-2.5-flash","Gemini 2.5 flash (pinned)").setValue(this.plugin.settings.geminiDefaultModel).onChange(async y=>{this.plugin.settings.geminiDefaultModel=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Enable Google search grounding by default").setDesc("Sends the Google_search tool with every request. Disable to get ungrounded model knowledge only.").addToggle(w=>w.setValue(this.plugin.settings.geminiEnableGrounding).onChange(async y=>{this.plugin.settings.geminiEnableGrounding=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Include Google searches list in notes").setDesc(`Appends a Markdown "Google searches" section listing the queries Gemini ran, each linked to Google search. Markdown-native substitute for the Google grounding chip (which is inline-styled HTML that Obsidian can't render cleanly).`).addToggle(w=>w.setValue(this.plugin.settings.geminiIncludeSearchSuggestions).onChange(async y=>{this.plugin.settings.geminiIncludeSearchSuggestions=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Resolve citation urls (durable, slower)").setDesc("Google's grounding redirect urls expire ~30 days after the response. With this on, the plugin resolves each redirect to the real source URL before writing the citations footer. Costs one HTTP request per cited source (parallelized, 3s timeout each).").addToggle(w=>w.setValue(this.plugin.settings.geminiResolveCitationUrls).onChange(async y=>{this.plugin.settings.geminiResolveCitationUrls=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Perplexica / vane (self-hosted)").setHeading(),e.createEl("p",{text:"Configure settings for your local perplexica / vane installation",cls:"setting-item-description"}),new g.Setting(e).setName("Endpoint").setDesc("API endpoint for your local perplexica / vane instance").addText(w=>w.setPlaceholder("HTTP://localhost:3030/API/search").setValue(this.plugin.settings.perplexicaEndpoint).onChange(async y=>{this.plugin.settings.perplexicaEndpoint=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Fallback container path").setDesc("Alternative endpoint for docker container setups").addText(w=>w.setPlaceholder("HTTP://host.docker.internal:3030/API/search").setValue(this.plugin.settings.localLLMPath).onChange(async y=>{this.plugin.settings.localLLMPath=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Default model").setDesc("Default AI model for perplexica / vane to use").addText(w=>w.setPlaceholder("Llama3.2:latest").setValue(this.plugin.settings.defaultModel).onChange(async y=>{this.plugin.settings.defaultModel=y,await this.plugin.saveSettings()}));let n=new g.Setting(e).setName("Request body template").setDesc("JSON template for perplexica / vane API requests"),i=e.createEl("textarea");if(i.rows=10,i.cols=50,i.addClass("perplexed-json-textarea"),i.placeholder="Enter perplexica JSON request template...",this.plugin.settings.requestBodyTemplate)try{let w=JSON.parse(this.plugin.settings.requestBodyTemplate);i.value=JSON.stringify(w,null,2)}catch{i.value=this.plugin.settings.requestBodyTemplate}i.addEventListener("input",()=>{(async()=>{this.plugin.settings.requestBodyTemplate=i.value,await this.plugin.saveSettings()})()}),n.settingEl.appendChild(i),new g.Setting(e).setName("Lm studio (local models)").setHeading(),e.createEl("p",{text:"Configure settings for your local lm studio installation with loaded models",cls:"setting-item-description"}),new g.Setting(e).setName("Endpoint").setDesc("API endpoint for your local lm studio instance").addText(w=>w.setPlaceholder("HTTP://localhost:1234/v1/chat/completions").setValue(this.plugin.settings.lmStudioEndpoint).onChange(async y=>{this.plugin.settings.lmStudioEndpoint=y,await this.plugin.saveSettings()})),new g.Setting(e).setName("Default model").setDesc("Default model name for lm studio to use").addText(w=>w.setPlaceholder("Ibm/granite-3.2-8b").setValue(this.plugin.settings.defaultLMStudioModel).onChange(async y=>{this.plugin.settings.defaultLMStudioModel=y,await this.plugin.saveSettings()}));let a=new g.Setting(e).setName("Request body template").setDesc("JSON template for lm studio API requests"),o=e.createEl("textarea");if(o.rows=10,o.cols=50,o.addClass("perplexed-json-textarea"),o.placeholder="Enter lm studio JSON request template...",this.plugin.settings.lmStudioRequestTemplate)try{let w=JSON.parse(this.plugin.settings.lmStudioRequestTemplate);o.value=JSON.stringify(w,null,2)}catch{o.value=this.plugin.settings.lmStudioRequestTemplate}o.addEventListener("input",()=>{(async()=>{this.plugin.settings.lmStudioRequestTemplate=o.value,await this.plugin.saveSettings()})()}),a.settingEl.appendChild(o),new g.Setting(e).setName("Prompts & text configuration").setHeading(),e.createEl("p",{text:"Customize all prompts, placeholders, descriptions, and messages used throughout the plugin",cls:"setting-item-description"}),new g.Setting(e).setName("System prompts").setHeading();let l=(w,y,P,A,C)=>{new g.Setting(e).setName(w).setDesc(y);let R=e.createEl("textarea");R.addClass("perplexed-prose-textarea"),R.placeholder=P,R.value=A(),R.rows=3,R.addEventListener("input",()=>{(async()=>{C(R.value);let M=this.plugin.getPromptsService();M&&M.updateSettings(this.plugin.settings.prompts),await this.plugin.saveSettings()})()})};l("Perplexity system prompt","System prompt used for perplexity AI requests","Enter system prompt for perplexity...",()=>this.plugin.settings.prompts.perplexitySystemPrompt,w=>{this.plugin.settings.prompts.perplexitySystemPrompt=w}),l("Perplexica / vane system prompt","System prompt used for perplexica / vane requests","Enter system prompt for perplexica / vane...",()=>this.plugin.settings.prompts.perplexicaSystemPrompt,w=>{this.plugin.settings.prompts.perplexicaSystemPrompt=w}),l("Lm studio default system prompt","Default system prompt used for lm studio requests","Enter default system prompt for lm studio...",()=>this.plugin.settings.prompts.lmStudioDefaultSystemPrompt,w=>{this.plugin.settings.prompts.lmStudioDefaultSystemPrompt=w}),new g.Setting(e).setName("Placeholder text").setHeading(),new g.Setting(e).setName("Perplexity query placeholder").setDesc("Placeholder text for perplexity query input").addText(w=>w.setPlaceholder("Enter placeholder text...").setValue(this.plugin.settings.prompts.perplexityQueryPlaceholder).onChange(async y=>{this.plugin.settings.prompts.perplexityQueryPlaceholder=y;let P=this.plugin.getPromptsService();P&&P.updateSettings(this.plugin.settings.prompts),await this.plugin.saveSettings()})),new g.Setting(e).setName("Perplexica / vane query placeholder").setDesc("Placeholder text for perplexica / vane query input").addText(w=>w.setPlaceholder("Enter placeholder text...").setValue(this.plugin.settings.prompts.perplexicaQueryPlaceholder).onChange(async y=>{this.plugin.settings.prompts.perplexicaQueryPlaceholder=y;let P=this.plugin.getPromptsService();P&&P.updateSettings(this.plugin.settings.prompts),await this.plugin.saveSettings()})),new g.Setting(e).setName("Lm studio query placeholder").setDesc("Placeholder text for lm studio query input").addText(w=>w.setPlaceholder("Enter placeholder text...").setValue(this.plugin.settings.prompts.lmStudioQueryPlaceholder).onChange(async y=>{this.plugin.settings.prompts.lmStudioQueryPlaceholder=y;let P=this.plugin.getPromptsService();P&&P.updateSettings(this.plugin.settings.prompts),await this.plugin.saveSettings()})),new g.Setting(e).setName("Lm studio system prompt placeholder").setDesc("Placeholder text for lm studio system prompt input").addText(w=>w.setPlaceholder("Enter placeholder text...").setValue(this.plugin.settings.prompts.lmStudioSystemPromptPlaceholder).onChange(async y=>{this.plugin.settings.prompts.lmStudioSystemPromptPlaceholder=y;let P=this.plugin.getPromptsService();P&&P.updateSettings(this.plugin.settings.prompts),await this.plugin.saveSettings()})),new g.Setting(e).setName("Article term placeholder").setDesc("Placeholder text for article generator term input").addText(w=>w.setPlaceholder("Enter placeholder text...").setValue(this.plugin.settings.prompts.articleTermPlaceholder).onChange(async y=>{this.plugin.settings.prompts.articleTermPlaceholder=y,this.updatePromptsService(),await this.plugin.saveSettings()})),new g.Setting(e).setName("Article generator template").setHeading();let c=new g.Setting(e).setName("Article generator template").setDesc("Template for generating articles. Use {TERM} as placeholder for the term."),d=e.createEl("textarea");d.rows=15,d.cols=50,d.addClasses(["perplexed-json-textarea","is-tall"]),d.placeholder="Enter article generator template...",d.value=this.plugin.settings.prompts.articleGeneratorTemplate,d.addEventListener("input",()=>{(async()=>{this.plugin.settings.prompts.articleGeneratorTemplate=d.value,this.updatePromptsService(),await this.plugin.saveSettings()})()}),c.settingEl.appendChild(d);let p=new g.Setting(e).setName("Deep research article generator template").setDesc("Template for generating articles with Deep Research model. Use {TERM} as placeholder for the term."),h=e.createEl("textarea");h.rows=20,h.cols=50,h.addClasses(["perplexed-json-textarea","is-tall"]),h.placeholder="Enter deep research article generator template...",h.value=this.plugin.settings.prompts.deepResearchArticleTemplate,h.addEventListener("input",()=>{(async()=>{this.plugin.settings.prompts.deepResearchArticleTemplate=h.value,this.updatePromptsService(),await this.plugin.saveSettings()})()}),p.settingEl.appendChild(h),new g.Setting(e).setName("Image prompts").setHeading();let u=new g.Setting(e).setName("Image references prompt").setDesc("Prompt added to queries when images are enabled"),f=e.createEl("textarea");f.rows=8,f.cols=50,f.addClass("perplexed-json-textarea"),f.placeholder="Enter image references prompt...",f.value=this.plugin.settings.prompts.imageReferencesPrompt,f.addEventListener("input",()=>{(async()=>{this.plugin.settings.prompts.imageReferencesPrompt=f.value,this.updatePromptsService(),await this.plugin.saveSettings()})()}),u.settingEl.appendChild(f),new g.Setting(e).setName("Text enhancement").setHeading();let v=new g.Setting(e).setName("Text enhancement prompt").setDesc("Template for enhancing selected text. Use {TEXT} as placeholder for the selected text."),S=e.createEl("textarea");S.rows=10,S.cols=50,S.addClass("perplexed-json-textarea"),S.placeholder="Enter text enhancement prompt template...",S.value=this.plugin.settings.prompts.enhancePrompt,S.addEventListener("input",()=>{(async()=>{this.plugin.settings.prompts.enhancePrompt=S.value,this.updatePromptsService(),await this.plugin.saveSettings()})()}),v.settingEl.appendChild(S);let T=new g.Setting(e).setName("Related images prompt").setDesc("Template for requesting related images for selected text. Use {TEXT} as placeholder for the selected text."),I=e.createEl("textarea");I.rows=10,I.cols=50,I.addClass("perplexed-json-textarea"),I.placeholder="Enter related images prompt template...",I.value=this.plugin.settings.prompts.enhanceWithImagesPrompt,I.addEventListener("input",()=>{(async()=>{this.plugin.settings.prompts.enhanceWithImagesPrompt=I.value,this.updatePromptsService(),await this.plugin.saveSettings()})()}),T.settingEl.appendChild(I),new g.Setting(e).setName("Directory templates").setHeading(),e.createEl("p",{text:"Apply a template (heading skeleton + per-section bullets) to fill a file via perplexity deep research. Templates live in a vault folder and are matched to files by glob.",cls:"setting-item-description"}),new g.Setting(e).setName("Templates root").setDesc("Vault-relative folder where directory templates live.").addText(w=>w.setPlaceholder("Zz-cf-lib/templates").setValue(this.plugin.settings.directoryTemplatesRoot).onChange(async y=>{this.plugin.settings.directoryTemplatesRoot=y.trim(),await this.plugin.saveSettings()})),new g.Setting(e).setName("Partials root").setDesc("Vault-relative folder where reusable snippets live. Templates pull them in with {{include: name}}.").addText(w=>w.setPlaceholder("Zz-cf-lib/partials").setValue(this.plugin.settings.directoryTemplatesPartialsRoot).onChange(async y=>{this.plugin.settings.directoryTemplatesPartialsRoot=y.trim(),await this.plugin.saveSettings()})),new g.Setting(e).setName("Preambles root").setDesc("Vault-relative folder where plugin-wide preambles live. Files here are auto-attached to every perplexity request per the lists below.").addText(w=>w.setPlaceholder("Zz-cf-lib/preambles").setValue(this.plugin.settings.directoryTemplatesPreamblesRoot).onChange(async y=>{this.plugin.settings.directoryTemplatesPreamblesRoot=y.trim(),await this.plugin.saveSettings()})),new g.Setting(e).setName("System preambles").setDesc("Comma-separated preamble names (no .md) prepended to every system prompt, in order. Default: inline-citation.").addText(w=>w.setPlaceholder("Inline-citation").setValue(this.plugin.settings.directoryTemplatesSystemPreambles.join(", ")).onChange(async y=>{this.plugin.settings.directoryTemplatesSystemPreambles=y.split(",").map(P=>P.trim()).filter(P=>P.length>0),await this.plugin.saveSettings()})),new g.Setting(e).setName("User preambles").setDesc('Comma-separated user-prompt preambles. Append ":return-images" to attach only when a template sets return-images: true. Default: research-framing, image-placement:return-images.').addText(w=>w.setPlaceholder("Research-framing, image-placement:return-images").setValue(this.plugin.settings.directoryTemplatesUserPreambles.map(y=>y.when==="always"?y.name:`${y.name}:${y.when}`).join(", ")).onChange(async y=>{this.plugin.settings.directoryTemplatesUserPreambles=y.split(",").map(P=>P.trim()).filter(P=>P.length>0).map(P=>{let[A,C]=P.split(":").map(M=>M.trim());return{name:A??"",when:C==="return-images"?"return-images":"always"}}).filter(P=>P.name.length>0),await this.plugin.saveSettings()})),new g.Setting(e).setName("Frontmatter whitelist").setDesc("Comma-separated list of frontmatter keys passed to the template as {{frontmatter}}. Other keys are filtered out.").addText(w=>w.setPlaceholder("Title, og_description, tags, og_image").setValue(this.plugin.settings.directoryTemplatesFrontmatterWhitelist.join(", ")).onChange(async y=>{this.plugin.settings.directoryTemplatesFrontmatterWhitelist=y.split(",").map(P=>P.trim()).filter(P=>P.length>0),await this.plugin.saveSettings()})),new g.Setting(e).setName("Request timeout (ms)").setDesc("Maximum wall-clock time to wait for a Perplexity response. Default 1800000 (30 min) \u2014 generous because deep-research runs on long analyst-grade templates routinely take 15-25 min and the $10-$50 of value per good output is worth waiting for. Individual templates may override this per-template via `request-timeout-ms:` in their cft block.").addText(w=>w.setPlaceholder("1800000").setValue(String(this.plugin.settings.directoryTemplatesRequestTimeoutMs)).onChange(async y=>{let P=parseInt(y,10);!isNaN(P)&&P>0&&(this.plugin.settings.directoryTemplatesRequestTimeoutMs=P,await this.plugin.saveSettings())})),new g.Setting(e).setName("Re-seed templates").setDesc("Write any shipped template files that are missing from the templates root. Existing files are never overwritten \u2014 to reset a template to its shipped default, delete the file first then re-seed.").addButton(w=>w.setButtonText("Re-seed").onClick(async()=>{try{await Ii(this.plugin.app,this.plugin.settings.directoryTemplatesRoot,this.plugin.settings.directoryTemplatesPartialsRoot,this.plugin.settings.directoryTemplatesPreamblesRoot)}catch(y){let P=y instanceof Error?y.message:String(y);new g.Notice(`Re-seed failed: ${P}`)}})),new g.Setting(e).setName("Find images for selection").setHeading(),e.createEl("p",{text:`Highlight a passage, run "find images for selection". The plugin asks perplexity for screenshots that visually illustrate the passage, prefers images on the entity's domain (frontmatter URL), and embeds them between paragraphs.`,cls:"setting-item-description"}),new g.Setting(e).setName("Max images").setDesc("Maximum number of images to embed per invocation.").addText(w=>w.setPlaceholder("3").setValue(String(this.plugin.settings.findImagesMaxImages)).onChange(async y=>{let P=parseInt(y,10);!isNaN(P)&&P>0&&(this.plugin.settings.findImagesMaxImages=P,await this.plugin.saveSettings())}))}};

/* nosourcemap */