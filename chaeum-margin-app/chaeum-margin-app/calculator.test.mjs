import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,validate,ceilStep} from './calculator.mjs';
const base={price:15000,cost:7000,quantity:10,unitsPerOrder:1,packing:500,packingBasis:'unit',shipping:2500,buyerShipping:0,other:0,otherBasis:'unit',adMode:'fixed',adFixed:0,adFixedBasis:'unit',taxReserve:5,targetMargin:20};
const fee={fee:10,card:3,cardIncluded:false,feeBasis:'sale',cardBasis:'sale'};
test('break-even at 18% total variable, target at 38%',()=>{const r=calculate(base,fee); assert.ok(Math.abs(r.breakeven.price-10000/.82)<.0001);assert.ok(Math.abs(r.goal.price-10000/.62)<.0001);assert.ok(Math.abs(calculate(base,fee,r.breakeven.price).profit)<1e-8)});
test('card fee is not charged twice if included',()=>{const r=calculate(base,{...fee,cardIncluded:true});assert.equal(r.cardFee,0);assert.equal(r.platformFee,1500);});
test('shipping/packing per order allocated across units',()=>{const r=calculate({...base,unitsPerOrder:5,packingBasis:'order'},fee);assert.equal(r.otherCost,600);assert.equal(r.costGoods,7000);});
test('tax reserve decreases profit and increases target selling price',()=>{const r=calculate(base,fee),no=calculate({...base,taxReserve:0},fee);assert.equal(r.taxReserve,750);assert.equal(no.taxReserve,0);assert.ok(r.goal.price>no.goal.price)});
test('buyer shipping is included in revenue and optionally fee base',()=>{let item={...base,buyerShipping:3000,unitsPerOrder:2};const r=calculate(item,{...fee,feeBasis:'payment',feeShipping:true});assert.equal(r.revenue,16500);assert.equal(r.platformFee,1650);assert.ok(Math.abs(calculate(item,{...fee,feeBasis:'payment',feeShipping:true},r.breakeven.price).profit)<1e-8)});
test('unachievable margin clearly returns null',()=>{let r=calculate({...base,targetMargin:90},{...fee,fee:20});assert.equal(r.goal.price,null);});
test('round up price not down',()=>{assert.equal(ceilStep(13001,500),13500)});
test('negative costs and out of range rates rejected',()=>{assert.ok(validate({...base,cost:-1},{...fee,fee:101}).length>=2)});
test('total revenue/profit multiplies by quantity',()=>{let r=calculate(base,fee);assert.equal(r.totalProfit,r.profit*10);});

test('goal margin uses total revenue including buyer shipping',()=>{const item={...base,buyerShipping:3000,unitsPerOrder:2,targetMargin:25};const r=calculate(item,fee);const atGoal=calculate(item,fee,r.goal.price);assert.ok(Math.abs(atGoal.margin-25)<1e-8)});
