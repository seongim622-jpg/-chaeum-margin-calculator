/** Pure price/profit calculation functions. All monetary inputs are KRW. */
export const PLATFORMS = ['네이버 스마트스토어','G마켓','쿠팡','아이스크림몰','직접 판매·기관 납품'];
export const number = value => { const n = Number(String(value ?? '').replaceAll(',', '')); return Number.isFinite(n) ? n : 0; };
export const validRate = value => value === '' || value === null || value === undefined || (Number.isFinite(number(value)) && number(value) >= 0 && number(value) <= 100);
export const ceilStep = (value, step=100) => Number.isFinite(value) ? Math.ceil(Math.max(0,value)/step)*step : null;
const rate = x => number(x)/100;
/**
 * Item sale price is separate from buyer-paid shipping, which is earned by seller.
 * Buying cost is conservatively kept at gross invoice amount even if purchaseVATIncluded is true.
 * No statutory VAT/income tax computed; taxReserve is only an internal reserve.
 */
export function calculate(item, platform={}, priceOverride) {
  const p = priceOverride === undefined ? number(item.price) : number(priceOverride);
  const qtyPerOrder = Math.max(1, Math.floor(number(item.unitsPerOrder) || 1));
  const units = Math.max(1, Math.floor(number(item.quantity) || 1));
  const buyerShip = number(item.buyerShipping)/qtyPerOrder;
  const sellerShip = number(item.shipping)/qtyPerOrder;
  const packing = number(item.packing)/(item.packingBasis === 'order' ? qtyPerOrder : 1);
  const other = number(item.other)/(item.otherBasis === 'order' ? qtyPerOrder : 1);
  const adFixed = number(item.adFixed)/(item.adFixedBasis === 'order' ? qtyPerOrder : 1);
  const costGoods = number(item.cost);
  const fees = rate(platform.fee);
  const card = platform.cardIncluded ? 0 : rate(platform.card);
  const ad = item.adMode === 'percent' ? rate(item.adPercent) : 0;
  const reserve = rate(item.taxReserve);
  const feeShipping = platform.feeBasis === 'payment' && platform.feeShipping ? buyerShip : 0;
  const cardShipping = platform.cardBasis === 'payment' && platform.cardShipping ? buyerShip : 0;
  const fixed = costGoods + packing + sellerShip + other + (item.adMode === 'fixed' ? adFixed : 0);
  const variable = fees+card+ad+reserve;
  const extraFees = feeShipping * fees + cardShipping * card;
  const numerator = fixed - buyerShip + extraFees;
  const solve = margin => {
    const denominator=1-variable-margin;
    if (denominator <= 1e-10) return {price:null,reason:'수수료·광고비·세금 적립률·목표 마진율의 합이 100% 이상입니다.'};
    return {price:Math.max(0,(numerator+margin*buyerShip)/denominator),reason:null};
  };
  const platformFee = (p+feeShipping)*fees;
  const cardFee=(p+cardShipping)*card;
  const adSpend=item.adMode==='percent' ? p*ad : adFixed;
  const taxReserve=p*reserve;
  const revenue=p+buyerShip;
  const otherCost=packing+sellerShip+other+adSpend;
  const totalCost=costGoods+otherCost+platformFee+cardFee+taxReserve;
  const profit=revenue-totalCost;
  const margin=revenue>0 ? profit/revenue*100 : null;
  return {p,revenue,profit,margin,units,qtyPerOrder,buyerShip,costGoods,platformFee,cardFee,otherCost,taxReserve,totalCost,
    totalRevenue:revenue*units,totalCostAll:totalCost*units,totalProfit:profit*units,
    fixed,variable,breakeven:solve(0),goal:solve(rate(item.targetMargin)),
    goals:[10,15,20,25,30].map(m=>({margin:m,...solve(m/100)}))};
}
export function validate(item, platform) {
  const errors=[];
  const moneyFields=['cost','price','quantity','unitsPerOrder','packing','shipping','buyerShipping','other','adFixed'];
  for (const key of moneyFields) if (!Number.isFinite(number(item[key])) || number(item[key])<0) errors.push(`${key}: 음수 또는 잘못된 금액`);
  if (number(item.quantity)<1 || !Number.isInteger(number(item.quantity))) errors.push('판매 수량은 1 이상의 정수여야 합니다.');
  if (number(item.unitsPerOrder)<1 || !Number.isInteger(number(item.unitsPerOrder))) errors.push('주문당 수량은 1 이상의 정수여야 합니다.');
  for (const [name,v] of [['플랫폼 수수료',platform.fee],['카드 수수료',platform.card],['광고비율',item.adPercent],['세금 적립률',item.taxReserve],['목표 마진율',item.targetMargin]]) if (!validRate(v)) errors.push(`${name}은 0~100%만 입력할 수 있습니다.`);
  return errors;
}
