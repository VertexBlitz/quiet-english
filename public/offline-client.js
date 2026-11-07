(() => {
const DB_NAME='quiet-english-offline-v1',STORE='materials';
function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('savedAt','savedAt');}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function save(item){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({...item,savedAt:new Date().toISOString()});tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>{db.close();reject(tx.error);};});}
async function all(){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>{db.close();resolve(req.result||[]);};req.onerror=()=>{db.close();reject(req.error);};});}
async function remove(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>{db.close();reject(tx.error);};});}
window.QuietOffline={save:save,all:all,remove:remove};
if('serviceWorker' in navigator && location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
})();