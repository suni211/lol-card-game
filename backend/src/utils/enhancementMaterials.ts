// Any owned, unlocked player card may be used as enhancement material,
// even when the player identity, season, enhancement grade or OVR differs.
// The routes verify ownership, target exclusion, locks and deck membership.
export function enhancementMaterialMatch(
  target:{player_id:number;level:number;overall:number;player_name?:string;team?:string},
  material:{player_id:number;level:number;overall:number;player_name?:string;team?:string}
):boolean {
  return Number.isFinite(Number(target.player_id)) &&
    Number.isFinite(Number(material.player_id)) &&
    Number(target.player_id)>0 && Number(material.player_id)>0;
}

// For upgrades +1..+4 a material fills 1.5 slots;
// +5 and above a material fills 1 slot. The meter has 5 slots.
export function enhancementMaterialSlots(targetLevel:number,validCount:number):number {
  const each=Number(targetLevel)<4?1.5:1;
  return Math.min(5,Math.max(0,Number(validCount))*each);
}
