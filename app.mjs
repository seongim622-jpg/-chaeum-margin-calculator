import { PLATFORMS,number,ceilStep,calculate,validate,setBreakdown,effectiveItem } from './calculator.mjs';
const KEY='chaeum-margin-v1';
const fresh=()=>({id:null,name:'',mode:'single',kitSetCount:10,kitPacking:0,kitItems:[{id:'kit-1',name:'만들기 재료 A',cost:730,qty:2,shipping:0},{id:'kit-2',name:'만들기 재료 B',cost:1200,qty:1,shipping:0},{id:'kit-3',name:'꾸미기 스티커',cost:300,qty:3,shipping:0}],platform:PLATFORMS[0],business:'간이과세자',purchaseVATIncluded:true,cost:0,purchaseShipping:0,price:0,quantity:70,salesQuantity:70,unitsPerOrder:1,packing:0,packingBasis:'unit',shipping:0,buyerShipping:0,other:0,otherBasis:'unit',adMode:'fixed',adFixed:0,adPercent:0,adFixedBasis:'unit',taxReserve:0,targetMargin:20,roundStep:100});
const newPlatform=()=>({fee:'',card:'',cardIncluded:false,feeBasis:'sale',feeShipping:false,cardBasis:'sale',cardShipping:false});
const defaultState=()=>({item:fresh(),platforms:Object.fromEntries(PLATFORMS.map(x=>[x,newPlatform()])),products:[]});
let state;try{state={...defaultState(),...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{state=defaultState()}
state.platforms={...defaultState().platforms,...state.platforms};if(state.item && state.item.salesQuantity===undefined)state.item.salesQuantity=state.item.quantity;state.item={...fresh(),...state.item};if(!Array.isArray(state.item.kitItems))state.item.kitItems=fresh().kitItems;state.products=Array.isArray(state.products)?state.products:[];
const el=id=>document.getElementById(id),money=n=>Math.round(n).toLocaleString('ko-KR')+'원',precise=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2})+'원',percent=n=>Number.isFinite(n)?n.toFixed(1)+'%':'—';
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('저장 공간이 부족하거나 브라우저 저장이 차단되었습니다.')}};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(label,key,type='money',options=null,full=false)=>{
 const v=state.item[key]??'';const cls=full?'field full':'field';
 if(type==='select')return `<label class="${cls}"><span>${label}</span><select data-key="${key}">${options.map(([value,title])=>`<option value="${safe(value)}" ${value===v?'selected':''}>${safe(title)}</option>`).join('')}</select></label>`;
 if(type==='checkbox')return `<label class="checkLabel ${cls}"><input data-key="${key}" type="checkbox" ${v?'checked':''}>${label}</label>`;
 return `<label class="${cls}"><span>${label}</span><input data-key="${key}" type="${type==='text'?'text':'text'}" inputmode="${type==='text'?'text':'decimal'}" data-numeric="${type==='text'?'false':'true'}" value="${safe(type==='money'&&v!==''?number(v).toLocaleString('ko-KR'):v)}" ${type==='money'?'placeholder="0"':''}></label>`;
};
const unitOrder=[['unit','상품 1개당'],['order','주문 1건당']];
function renderInputs(){
 const set=state.item.mode==='set';
 el('inputs').innerHTML=[
 field('상품명 (저장할 때만 입력)','name','text',null,true),
 field('판매 플랫폼','platform','select',PLATFORMS.map(x=>[x,x]),true),
 field('상품 유형','mode','select',[['single','단일상품'],['set','세트상품']],true),
 ...(set?[field('현재 예상 세트 판매가 (원 · 선택)','price')]:[
 field('개당 상품 매입가 (원)','cost'),
 field('예상 구매 수량 (개) · 매입 배송비를 나누는 수량','quantity'),
 field('매입 시 총 배송비 (원) · 전체 구매분 1회 배송비','purchaseShipping','money',null,true),
 field('개당 포장비 (원)','packing'),
 field('현재 예상 판매가 (원 · 선택)','price')
 ])
 ].join('');
 el('kitPanel').classList.toggle('hidden',!set);
 if(set)renderKit();
 el('targetSlider').value=state.item.targetMargin;el('sliderValue').textContent=state.item.targetMargin+'%';el('roundStep').value=state.item.roundStep;
}
function renderKit(){
 const kit=setBreakdown(state.item);
 const rows=(state.item.kitItems||[]).map((r,i)=>`<div class="kitRow" data-kit-row="${safe(r.id)}">
 <label class="kitName"><span class="srOnly">구성품명 ${i+1}</span><input data-kit-field="name" type="text" lang="ko" inputmode="text" autocapitalize="off" autocomplete="off" spellcheck="false" value="${safe(r.name)}" placeholder="구성품명"></label>
 <label><span class="srOnly">개당 원가 ${i+1}</span><input data-kit-field="cost" inputmode="decimal" value="${safe(number(r.cost).toLocaleString('ko-KR'))}"></label>
 <label><span class="srOnly">세트당 수량 ${i+1}</span><input data-kit-field="qty" inputmode="numeric" value="${safe(number(r.qty).toLocaleString('ko-KR'))}"></label>
 <label><span class="srOnly">해당 구성품 총 매입 배송비 ${i+1}</span><input data-kit-field="shipping" inputmode="decimal" value="${safe(number(r.shipping).toLocaleString('ko-KR'))}"></label>
 <button class="kitRemove" data-kit-remove="${safe(r.id)}" aria-label="구성품 삭제">×</button></div>`).join('');
 el('kitPanel').innerHTML=`<h2>세트상품 원가 계산</h2><p class="muted">구성품을 추가하면 세트 1개의 원가가 자동으로 합산돼요.</p>
 <div class="kitLabels"><span>구성품명</span><span>개당 원가</span><span>수량</span><span>배송비</span><span></span></div>
 <div id="kitRows">${rows}</div><button class="kitAdd" id="kitAdd" type="button">＋ 구성품 추가하기</button>
 <div class="kitSubtotal"><span>세트 1개 재료비</span><b id="kitMaterials">${money(kit.materials)}</b></div>
 <div class="fields kitExtras"><label class="field"><span>제작할 세트 수량</span><input data-kit-top="kitSetCount" inputmode="numeric" value="${safe(number(state.item.kitSetCount))}"></label>
 <label class="field"><span>세트당 포장비</span><input data-kit-top="kitPacking" inputmode="decimal" value="${safe(number(state.item.kitPacking).toLocaleString('ko-KR'))}"></label></div>
 <p class="muted">상품 총 매입가는 위 구성품의 매입가 × 입력 수량만 합산하며, 세트 수량으로 다시 곱하지 않습니다. 세트 수량은 배송비 배분과 전체 포장비 계산에 사용합니다. 실제 구매 수량과 세트당 사용 수량이 다르면 원가를 추가 확인해 주세요.</p>
 <div class="kitSummary"><div><span>상품 총 매입가</span><b id="kitTotalGoods">${money(kit.materials)}</b></div>
 <div><span>구성품별 배송비 합계</span><b id="kitTotalShip">${money(kit.shipping)}</b></div>
 <div><span>배송비 포함 총 매입금액</span><b id="kitPurchaseTotal">${money(kit.totalPurchase)}</b></div>
 <div><span>전체 포장비 (세트 수량 × 세트당 포장비)</span><b id="kitTotalPacking">${money(kit.totalPacking)}</b></div>
 <div><span>매입금액 + 전체 포장비</span><b id="kitGrandTotal">${money(kit.grandTotal)}</b></div>
 <div class="kitCost"><span>배송비·포장비 포함 세트 원가</span><strong id="kitUnitCost">${kit.setCount>0?money(kit.materialCostPerSet+number(state.item.kitPacking)):'수량 확인 필요'}</strong></div></div>`;
}
function refreshKitTotals(){
 if(state.item.mode!=='set')return;
 const kit=setBreakdown(state.item);
 for(const [id,value] of Object.entries({
 kitMaterials:money(kit.materials),kitTotalGoods:money(kit.materials),
 kitTotalShip:money(kit.shipping),kitPurchaseTotal:money(kit.totalPurchase),
 kitTotalPacking:money(kit.totalPacking),kitGrandTotal:money(kit.grandTotal),
 kitUnitCost:kit.setCount>0?money(kit.materialCostPerSet+number(state.item.kitPacking)):'수량 확인 필요'})){
 const node=el(id);if(node)node.textContent=value;
 }
}
function advancedFields(){return `<h3 class="advancedTitle">광고비 · 기타 비용</h3><div class="fields">${[
 field('광고비 방식','adMode','select',[['fixed','개당 원'],['percent','판매가 대비 %']]),
 ...(state.item.adMode==='fixed'?[field('광고비 (원)','adFixed')]:[field('광고비율 (%)','adPercent')]),
 field('고객에게 발송할 때 판매자 부담 배송비 (원 / 주문)','shipping'),
 field('예상 판매 수량 (개) · 총이익 계산용','salesQuantity'),
 field('주문당 판매 수량 (개)','unitsPerOrder'),
 field('기타 비용 (원 / 개)','other'),
 field('예상 세금 적립률 (%)','taxReserve'),
 field('사업자 유형','business','select',['간이과세자','일반과세자','면세사업자'].map(x=>[x,x])),
 field('매입가에 부가세 포함','purchaseVATIncluded','checkbox')
 ].join('')}</div><p class="muted">판매자 부담 배송비는 주문당 판매 수량으로 나눠 개당 비용에 반영됩니다. 광고비·세금 적립액은 실제 부가세 산출이 아닙니다.</p>`}
function settingsField(label,key,kind='rate',options){const p=state.platforms[state.item.platform];if(kind==='check')return `<label class="checkLabel field full"><input type="checkbox" data-setting="${key}" ${p[key]?'checked':''}>${label}</label>`;if(kind==='select')return `<label class="field"><span>${label}</span><select data-setting="${key}">${options.map(([v,t])=>`<option value="${v}" ${v===p[key]?'selected':''}>${t}</option>`).join('')}</select></label>`;return `<label class="field"><span>${label}</span><input data-setting="${key}" type="number" min="0" max="100" step="0.01" placeholder="미설정" value="${safe(p[key])}"></label>`;}
function renderSettings(){el('settingsFields').innerHTML=[settingsField('플랫폼 수수료 (%)','fee'),settingsField('별도 카드결제 수수료 (%)','card'),settingsField('카드 수수료가 플랫폼 수수료에 이미 포함되어 있음','cardIncluded','check'),settingsField('플랫폼 수수료 기준','feeBasis','select',[['sale','상품 판매가'],['payment','결제금액']]),settingsField('플랫폼 수수료에 구매자 배송비 포함','feeShipping','check'),settingsField('카드 수수료 기준','cardBasis','select',[['sale','상품 판매가'],['payment','결제금액']]),settingsField('카드 수수료에 구매자 배송비 포함','cardShipping','check')].join('')+'<div class="advancedItems">'+advancedFields()+'</div>';}
function render(){renderInputs();renderSettings();results();saved();}
function getPlatform(){return state.platforms[state.item.platform]||newPlatform()}
function missing(p){return p.fee==='' || (!p.cardIncluded&&p.card==='')}
function results(){const item=state.item,p=getPlatform(),errors=validate(item,p),error=el('error');error.classList.toggle('hidden',!errors.length);error.textContent=errors.join(' / ');if(errors.length){el('summary').innerHTML='입력값을 확인해 주세요.';for(const id of ['goals','bar','legend','totals','comparison'])el(id).innerHTML='';return;}
const r=calculate(item,p),step=number(item.roundStep)||100,kit=item.mode==='set'?setBreakdown(item):null;
el('warning').textContent=(missing(p)?'⚠ 플랫폼 수수료 일부 미설정: 미입력 요율을 0%로 가정합니다. ':'')+(!kit&&number(item.shipping)>0&&number(item.purchaseShipping)===0?'⚠ 판매자 부담 배송비에 금액이 있습니다. 이 금액이 상품을 매입할 때 내는 배송료라면 위의 ‘매입 시 총 배송비’ 칸으로 옮겨 주세요. ':'')+(kit?'구성품별 배송비는 제작 세트 수량에 배분됩니다.':'매입 배송비는 전체 구매 수량으로 나눕니다.')+' 실제 세금·정산액과 다를 수 있습니다.';
const priceText=obj=>obj.price===null?'<small>계산 불가</small>':money(ceilStep(obj.price,step));
el('summary').innerHTML=[[(kit?'배송비 배분 후 세트 재료원가':'배송비 포함 개당 매입원가'),precise(r.costGoods),kit?`세트 재료비 ${money(kit.materials)} + 배송비 ${money(kit.shipping)} ÷ ${kit.setCount}세트`:`${precise(number(item.cost))} + ${money(number(item.purchaseShipping))} ÷ ${r.purchaseQty}개 = ${precise(r.costGoods)} (개당 배송비 ${precise(r.purchaseShippingPerUnit)})`,false],['손익분기 판매가',priceText(r.breakeven),r.breakeven.reason||'모든 예상 비용 회수 기준',false],['목표 '+item.targetMargin+'% 권장가',priceText(r.goal),r.goal.reason||`${step.toLocaleString()}원 단위 올림`,true],['현재 예상 이익',money(r.profit),'상품 1개당 · 소득세 차감 전',false],['현재 예상 순이익률',percent(r.margin),'배송비 수입을 포함한 총매출 대비',false]].map(([label,val,info,highlight],i)=>`<article class="metric ${highlight?'highlight':''}"><div class="label">${label}</div><div class="value ${i>=3?(r.profit<0?'negative':'positive'):''}">${val}</div><small>${safe(info)}</small></article>`).join('');
el('goals').innerHTML=r.goals.map(g=>`<div class="goalRow ${g.margin===number(item.targetMargin)?'active':''}"><span>목표 마진 <b>${g.margin}%</b></span><b>${g.price===null?`계산 불가 · ${safe(g.reason)}`:money(ceilStep(g.price,step))}</b></div>`).join('');
const parts=[['상품 매입원가',r.costGoods,'#562452'],['플랫폼·결제 수수료',r.platformFee+r.cardFee,'#ae80ac'],['포장·배송·광고 등',r.otherCost,'#e9d0b6'],['예상 세금 적립액',r.taxReserve,'#d7a75b'],['예상 순이익',Math.max(0,r.profit),'#16805f']];const sum=parts.reduce((a,b)=>a+b[1],0);el('bar').innerHTML=`<div class="barTrack" role="img" aria-label="수익구성 그래프">${parts.map(([l,v,c])=>`<div title="${l}: ${money(v)}" class="barSeg" style="width:${sum?100*v/sum:0}%;background:${c}"></div>`).join('')}</div>${r.profit<0?`<p class="lossAlert">손실 ${money(-r.profit)} 발생 · 총비용이 매출보다 큽니다.</p>`:''}`;
el('legend').innerHTML=`<div class="legendGrid">${parts.map(([l,v,c])=>`<span><i class="dot" style="background:${c}"></i>${l} ${money(v)}</span>`).join('')}</div>`;
el('totals').innerHTML=[[(kit?'세트당 구성품 배송비 배분':'총매입 배송비 배분'),kit?`${money(kit.shipping)} ÷ ${kit.setCount}세트 = ${precise(kit.perSetShipping)}/세트`:`${money(number(item.purchaseShipping))} ÷ ${r.purchaseQty}개 = ${precise(r.purchaseShippingPerUnit)}/개`],['예상 판매 수량',r.units.toLocaleString()+'개'],['예상 총매출',money(r.totalRevenue)],['예상 총비용',money(r.totalCostAll)],['예상 총이익',money(r.totalProfit)]].map(([k,v])=>`<div class="totalRow"><span>${k}</span><b>${v}</b></div>`).join('');
el('taxMessage').textContent=`현재 사업자 유형: ${item.business}. 실제 예상 부가세: 계산 보류(신고 조건 미확인). 매입가 부가세 ${item.purchaseVATIncluded?'포함':'별도/미포함'} 표시를 보관하지만, 본 계산은 입력된 매입가 그대로를 원가로 사용합니다.`;
el('comparison').innerHTML=PLATFORMS.map(name=>{const cp=state.platforms[name];if(missing(cp))return `<tr><td>${safe(name)}</td><td>${money(number(item.price))}</td><td colspan="4">수수료 미설정 · 요율 입력 후 비교 가능</td></tr>`;const rr=calculate(item,cp);return `<tr><td>${safe(name)}</td><td>${money(rr.p)}</td><td>${number(cp.fee)}% + 카드 ${cp.cardIncluded?'포함':number(cp.card)+'%'}</td><td class="${rr.profit<0?'negative':'positive'}">${money(rr.profit)}</td><td>${percent(rr.margin)}</td><td>${rr.goal.price===null?'계산 불가':money(ceilStep(rr.goal.price,step))}</td></tr>`}).join('');
}
function saved(){const q=el('search').value.trim().toLowerCase();const items=state.products.filter(x=>String(x.name).toLowerCase().includes(q));el('savedList').innerHTML=items.length?items.map(x=>`<div class="savedRow"><div><strong>${safe(x.name||'이름 없는 상품')}</strong><small>${safe(x.platform)} · 매입가 ${money(number(x.cost))} / 매입 배송비 ${money(number(x.purchaseShipping))} / 판매가 ${money(number(x.price))} · 수정 ${safe((x.updated||'').slice(0,10))} · 이력 ${(x.history||[]).length}건</small></div><div class="tools"><button data-act="load" data-id="${x.id}" class="smallbtn">불러오기</button><button data-act="copy" data-id="${x.id}" class="smallbtn">복제</button><button data-act="history" data-id="${x.id}" class="smallbtn">이력</button><button data-act="delete" data-id="${x.id}" class="smallbtn">삭제</button></div></div>`).join(''):'<p class="muted">저장된 상품이 없습니다.</p>'}
function toast(msg){window.alert(msg)}
function updateItem(key,value){if(key==='platform'){state.item.platform=value;render();persist();return;}if(['adMode','mode'].includes(key)){state.item[key]=value;if(key==='mode'){if(value==='set')state.item.salesQuantity=number(state.item.kitSetCount);render();}else{renderSettings();results();}persist();return;}state.item[key]=value;if(key==='targetMargin'){el('targetSlider').value=number(value);el('sliderValue').textContent=value+'%';}results();persist();}
el('inputs').addEventListener('input',e=>{const t=e.target;if(!t.dataset.key)return;let value=t.type==='checkbox'?t.checked:t.value;if(t.dataset.numeric==='true'){const raw=value.replaceAll(',','');if(raw!==''&&(!/^\d*(\.\d*)?$/.test(raw)))return;t.value=raw===''?'':Number(raw).toLocaleString('en-US',{maximumFractionDigits:4});value=raw===''?0:Number(raw);}updateItem(t.dataset.key,value)});
el('inputs').addEventListener('change',e=>{const t=e.target;if(t.tagName==='SELECT')updateItem(t.dataset.key,t.value);if(t.type==='checkbox')updateItem(t.dataset.key,t.checked)});
el('kitPanel').addEventListener('input',e=>{
 const t=e.target;if(t.dataset.kitField==='name' && e.isComposing)return;if(t.dataset.kitTop){
  const raw=t.value.replaceAll(',','');if(!/^\d*(\.\d*)?$/.test(raw))return;
  state.item[t.dataset.kitTop]=raw===''?0:Number(raw);
  if(t.dataset.kitTop==='kitSetCount')state.item.salesQuantity=Number(raw)||0;
  results();refreshKitTotals();persist();return;
 }
 const key=t.dataset.kitField;if(!key)return;
 const row=state.item.kitItems.find(r=>String(r.id)===t.closest('[data-kit-row]')?.dataset.kitRow);if(!row)return;
 if(key==='name')row[key]=t.value;
 else{const raw=t.value.replaceAll(',','');if(!/^\d*(\.\d*)?$/.test(raw))return;row[key]=raw===''?0:Number(raw);}
 results();refreshKitTotals();persist();
});
el('kitPanel').addEventListener('compositionend',e=>{
 const t=e.target;if(t.dataset.kitField!=='name')return;
 const row=state.item.kitItems.find(r=>String(r.id)===t.closest('[data-kit-row]')?.dataset.kitRow);
 if(row){row.name=t.value;persist();}
});
el('kitPanel').addEventListener('click',e=>{
 if(e.target.closest('#kitAdd')){
  state.item.kitItems.push({id:'kit-'+Date.now()+'-'+Math.random().toString(36).slice(2),name:'',cost:0,qty:1,shipping:0});
  renderKit();results();persist();return;
 }
 const remove=e.target.closest('[data-kit-remove]');if(remove){
  state.item.kitItems=state.item.kitItems.filter(r=>String(r.id)!==remove.dataset.kitRemove);
  renderKit();results();persist();
 }
});
el('settingsFields').addEventListener('input',e=>{const t=e.target;
 if(t.dataset.key){let v=t.type==='checkbox'?t.checked:t.value;if(t.dataset.numeric==='true'){const raw=String(v).replaceAll(',','');if(raw!==''&&!/^\d*(\.\d*)?$/.test(raw))return;t.value=raw===''?'':Number(raw).toLocaleString('en-US',{maximumFractionDigits:4});v=raw===''?0:Number(raw);}updateItem(t.dataset.key,v);return;}
 const key=t.dataset.setting;if(!key)return;const p=getPlatform();p[key]=t.type==='checkbox'?t.checked:t.value;results();persist()});
el('settingsFields').addEventListener('change',e=>{const t=e.target;
 if(t.dataset.key){if(t.tagName==='SELECT'||t.type==='checkbox')updateItem(t.dataset.key,t.type==='checkbox'?t.checked:t.value);return;}
 const key=t.dataset.setting;if(!key)return;getPlatform()[key]=t.type==='checkbox'?t.checked:t.value;results();persist()});
el('settingsToggle').onclick=()=>el('settings').classList.toggle('hidden');el('saveSettings').onclick=()=>{const errs=validate(state.item,getPlatform());if(errs.length)toast(errs.join('\n'));else{persist();toast('선택 플랫폼 수수료 설정을 저장했습니다.')}};
el('targetSlider').oninput=e=>{state.item.targetMargin=Number(e.target.value);el('sliderValue').textContent=e.target.value+'%';const other=el('inputs').querySelector('[data-key="targetMargin"]');if(other)other.value=e.target.value;results();persist()};
el('roundStep').onchange=e=>{state.item.roundStep=Number(e.target.value);results();persist()};
el('save').onclick=()=>{const item=state.item;if(!item.name.trim()){toast('상품명을 입력하세요.');return}if(validate(item,getPlatform()).length){toast('잘못된 입력값을 수정하세요.');return}const time=new Date().toISOString(),idx=state.products.findIndex(x=>x.id===item.id);if(idx>=0){const old=state.products[idx],history=old.history||[];if(Number(old.cost)!==Number(item.cost)||Number(old.purchaseShipping||0)!==Number(item.purchaseShipping||0)||Number(old.price)!==Number(item.price)||JSON.stringify(old.kitItems)!==JSON.stringify(item.kitItems))history.push({at:time,cost:old.cost,purchaseShipping:old.purchaseShipping,price:old.price});state.products[idx]={...item,history,updated:time}}else{item.id=crypto.randomUUID();state.products.unshift({...item,history:[],updated:time})}persist();saved();toast('상품이 저장되었습니다.')};
el('reset').onclick=()=>{state.item=fresh();render();persist()};el('clearAll').onclick=()=>{if(confirm('입력 내용만 초기화할까요? 저장 상품과 플랫폼 설정은 유지됩니다.')){state.item=fresh();render();persist()}};
el('savedList').onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;const idx=state.products.findIndex(x=>x.id===b.dataset.id);if(idx<0)return;const x=state.products[idx];if(b.dataset.act==='load'){state.item={...fresh(),...x,salesQuantity:x.salesQuantity??x.quantity};render();persist();window.scrollTo({top:0,behavior:'smooth'})}else if(b.dataset.act==='copy'){state.item={...fresh(),...x,salesQuantity:x.salesQuantity??x.quantity,id:null,name:(x.name||'상품')+' (복사본)'};render();persist();window.scrollTo({top:0,behavior:'smooth'})}else if(b.dataset.act==='delete'){if(confirm('이 상품을 삭제할까요?')){state.products.splice(idx,1);persist();saved()}}else if(b.dataset.act==='history'){const h=x.history||[];toast(h.length?h.map(v=>`${new Date(v.at).toLocaleString('ko-KR')}: 매입 ${money(number(v.cost))} / 판매 ${money(number(v.price))}`).join('\n'):'이전 가격 변경 이력이 없습니다.')}};
el('search').oninput=saved;
el('calculateCopy').onclick=async()=>{const r=calculate(state.item,getPlatform()),item=state.item;const t=`채움크리에이티브 상품 마진 분석\n상품: ${item.name}\n플랫폼: ${item.platform}\n현재 판매가: ${money(r.p)}\n손익분기 판매가: ${r.breakeven.price===null?'계산 불가':money(ceilStep(r.breakeven.price,item.roundStep))}\n목표 ${item.targetMargin}% 권장 판매가: ${r.goal.price===null?'계산 불가':money(ceilStep(r.goal.price,item.roundStep))}\n예상 이익(소득세 차감 전): ${money(r.profit)}\n예상 이익률: ${percent(r.margin)}\n총 예상 이익: ${money(r.totalProfit)}\n주의: 내부 세금 적립액만 반영, 실제 부가세 미산출${missing(getPlatform())?' / 수수료 미설정':''}`;try{await navigator.clipboard.writeText(t);toast('계산 결과를 복사했습니다.')}catch{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('계산 결과를 복사했습니다.')}};
el('print').onclick=()=>window.print();
function download(filename,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
el('exportJSON').onclick=()=>download('chaeum-margin-backup.json',JSON.stringify({version:1,...state},null,2),'application/json');
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
el('exportCSV').onclick=()=>{const fields=['id','name','mode','kitSetCount','kitPacking','kitItems','platform','business','purchaseVATIncluded','cost','purchaseShipping','price','quantity','salesQuantity','unitsPerOrder','packing','packingBasis','shipping','buyerShipping','other','otherBasis','adMode','adFixed','adPercent','adFixedBasis','taxReserve','targetMargin','roundStep','updated','history'];const rows=[fields.join(','),...state.products.map(p=>fields.map(k=>csvCell((k==='history'||k==='kitItems')?JSON.stringify(p[k]||[]):p[k])).join(','))];download('chaeum-margin-products.csv','\ufeff'+rows.join('\r\n'),'text/csv;charset=utf-8')};
function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);if(row.some(Boolean))rows.push(row);const [head,...data]=rows;return data.map(r=>{const x=Object.fromEntries(head.map((h,i)=>[h,r[i]??'']));for(const k of ['kitSetCount','kitPacking','cost','purchaseShipping','price','quantity','salesQuantity','unitsPerOrder','packing','shipping','buyerShipping','other','adFixed','adPercent','taxReserve','targetMargin','roundStep'])x[k]=number(x[k]);x.purchaseVATIncluded=x.purchaseVATIncluded==='true';try{x.history=JSON.parse(x.history||'[]')}catch{x.history=[]}try{x.kitItems=JSON.parse(x.kitItems||'[]')}catch{x.kitItems=[]}return x})}
el('importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=await f.text();if(f.name.toLowerCase().endsWith('.csv')){const products=parseCSV(data.replace(/^\ufeff/,''));if(!Array.isArray(products)||products.some(p=>!p.name))throw Error('상품 데이터 형식을 확인하세요.');if(!confirm(`CSV 상품 ${products.length}개를 추가할까요? 같은 ID의 상품은 덮어씁니다.`))return;const m=new Map(state.products.map(x=>[x.id,x]));for(const x of products)m.set(x.id||crypto.randomUUID(),x);state.products=[...m.values()]}else{const j=JSON.parse(data);if(j.version!==1||!Array.isArray(j.products)||!j.platforms)throw Error('지원하지 않는 백업 형식입니다.');if(!confirm('현재 상품·플랫폼 설정을 JSON 백업으로 교체할까요?'))return;state={...defaultState(),...j,item:{...fresh(),...j.item},platforms:{...defaultState().platforms,...j.platforms}};}persist();render();toast('가져오기를 완료했습니다.')}catch(err){toast('가져오기 실패: '+err.message)}finally{e.target.value=''}};
render();
