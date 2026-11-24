export const MAX_LEVEL=50;
export function threshold(level:number){const n=Math.max(1,Math.min(MAX_LEVEL,Math.floor(level)))-1;return 100*n+25*n*(n-1)}
export function levelFor(xp:number){let l=1;while(l<MAX_LEVEL&&xp>=threshold(l+1))l++;return l}
export function deliveryXP(meters:number){return 25+Math.min(75,Math.floor(Math.max(0,meters)/100)*5)}
export function rank(level:number){return level<=5?'Shipper tập sự':level<=10?'Shipper chính thức':level<=20?'Shipper chuyên nghiệp':level<=30?'Shipper kỳ cựu':level<=40?'Shipper tinh anh':'Huyền thoại Đà Nẵng'}
export function reward(level:number){return level*5000}
export function advanceXP(xp:number,meters:number){const next=Math.min(threshold(MAX_LEVEL),xp+deliveryXP(meters));const levels=Array.from({length:Math.max(0,levelFor(next)-levelFor(xp))},(_,i)=>levelFor(xp)+i+1);return {xp:next,level:levelFor(next),gained:next-xp,levels}}
