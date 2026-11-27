// Server-only IAM invocation. Fixed AWS service, region and function; no user-supplied URL.
import {createHash,createHmac} from 'node:crypto';
const region='eu-north-1',host='lambda.'+region+'.amazonaws.com',path='/2015-03-31/functions/novapharm-private-wms-price-publisher/invocations';
const hash=v=>createHash('sha256').update(v).digest('hex');
const hmac=(key,v)=>createHmac('sha256',key).update(v).digest();
export function signedPublisherRequest(payload,credentials,instant=new Date()){
 const {AccessKeyId,SecretAccessKey,Token}=credentials;
 if(![AccessKeyId,SecretAccessKey,Token].every(v=>typeof v==='string'&&v.length>0&&!/[\r\n]/.test(v)))throw Error('Invalid workload credentials');
 const body=JSON.stringify(payload),stamp=instant.toISOString().replace(/[:-]|\.\d{3}/g,''),day=stamp.slice(0,8);
 const headers={'content-type':'application/json','host':host,'x-amz-date':stamp,'x-amz-security-token':Token};
 const names=Object.keys(headers).sort();
 const canonical=['POST',path,'',names.map(k=>k+':'+headers[k].trim()+'\n').join(''),names.join(';'),hash(body)].join('\n');
 const scope=day+'/'+region+'/lambda/aws4_request';
 const key=hmac(hmac(hmac(hmac('AWS4'+SecretAccessKey,day),region),'lambda'),'aws4_request');
 const signature=hmac(key,['AWS4-HMAC-SHA256',stamp,scope,hash(canonical)].join('\n')).toString('hex');
 return {url:'https://'+host+path,init:{method:'POST',headers:{...headers,authorization:'AWS4-HMAC-SHA256 Credential='+AccessKeyId+'/'+scope+', SignedHeaders='+names.join(';')+', Signature='+signature},body,redirect:'error',signal:AbortSignal.timeout(20000)}};
}
export async function invokePricePublisher(payload,{env=process.env,fetcher=fetch}={}){
 // Only ECS task-role credentials. No access keys from the browser or env, no arbitrary metadata URI.
 const relative=env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
 if(typeof relative!=='string'||!/^\/v2\/credentials\/[a-f0-9-]{36}$/i.test(relative))throw Error('Dedicated ECS workload credentials unavailable');
 const response=await fetcher('http://169.254.170.2'+relative,{redirect:'error',signal:AbortSignal.timeout(3000)});
 if(!response.ok)throw Error('Workload credentials unavailable');
 const credentials=await response.json();
 if(!Number.isFinite(Date.parse(credentials.Expiration))||Date.parse(credentials.Expiration)<=Date.now()+30000)throw Error('Workload credentials expired');
 const req=signedPublisherRequest(payload,credentials);
 const reply=await fetcher(req.url,req.init);
 if(!reply.ok||reply.headers.get('x-amz-function-error'))throw Error('Private price publisher unavailable');
 return reply.json();
}
