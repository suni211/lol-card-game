// Enhancement material slots: +1 to +4 attempts fill 1.5 slots per
// matching card; attempts at +5 and above fill exactly one slot.
// A valid match is the same card identity AND grade, or equal player OVR.
export function enhancementMaterialMatch(target:{
  player_id:number;level:number;overall:number;player_name?:string;team?:string;
},material:{player_id:number;level:number;overall:number;player_name?:string;team?:string;}):boolean{
  const sameIdentity=Number(target.player_id)===Number(material.player_id)
    || (!!target.player_name&&!!material.player_name&&!!target.team&&!!material.team
      && String(target.player_name).normalize('NFKC').toLowerCase()===String(material.player_name).normalize('NFKC').toLowerCase()
      && String(target.team).normalize('NFKC').toLowerCase()===String(material.team).normalize('NFKC').toLowerCase());
  return (sameIdentity && Number(target.level)===Number(material.level))
    || Number(target.overall)===Number(material.overall);
}
export function enhancementMaterialSlots(targetLevel:number,validCount:number):number{
  const each=Number(targetLevel)<4?1.5:1;
  return Math.min(3,Math.max(0,Number(validCount))*each);
}
