import { describe, expect, it } from 'vitest';
function progress(b:number,t:number,v:number){return Math.max(0,Math.min(100,Math.round(((v-b)/(t-b))*100)));}
describe('progress',()=>{it('caps in range',()=>{expect(progress(10,20,30)).toBe(100);expect(progress(10,20,0)).toBe(0);});});
