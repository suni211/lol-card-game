"""Headless adapter for the original user-supplied rift-rebuild Python match engine.

Install engine.py, data.py, draft.py, terrain.py and assets/map.png from the
user's rift-rebuild.zip alongside this file. Match simulation stays in Python.
The browser/Node side only submits draft, player ratings and strategic intent.
"""
import json, math, os, random, sys, traceback
from pathlib import Path

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from data import KITS, ROLES
from draft import Draft
from engine import Match, DT

STAGE_OPTIONS={
    'early':{'LANE','OBJECTIVE'},
    'mid':{'MACRO','TEAMFIGHT','OBJECTIVE'},
    'late':{'MACRO','TEAMFIGHT','OBJECTIVE'},
}
def validate(req):
    squads=req.get('teams')
    if not isinstance(squads,list) or len(squads)!=2 or any(not isinstance(t,list) or len(t)!=5 for t in squads):
        raise ValueError('Both teams must have five players')
    for team in squads:
        for role,member in zip(ROLES,team):
            if not isinstance(member,dict) or member.get('position')!=role:
                raise ValueError('Player positions must match TOP/JUNGLE/MID/ADC/SUPPORT')
            if not isinstance(member.get('overall'),(int,float)) or not 50<=member['overall']<=120:
                raise ValueError('Overall must be 50..120')
    user=req.get('draft',{})
    picks=user.get('picks',{})
    bans=user.get('bans',[])
    if not isinstance(picks,dict) or not isinstance(bans,list) or len(bans)!=3:
        raise ValueError('Three bans and five champion picks required')
    if set(picks)!=set(ROLES):
        raise ValueError('One champion per role required')
    if len(set(picks.values()))!=5 or len(set(bans))!=3 or set(bans)&set(picks.values()):
        raise ValueError('Duplicate or self-banned champion')
    for role,champion in picks.items():
        if champion not in KITS or role not in KITS[champion].roles:raise ValueError(f'Invalid {role} champion {champion}')
    if any(c not in KITS for c in bans):raise ValueError('Unknown banned champion')
    strategies=req.get('strategies')
    if not isinstance(strategies,list) or len(strategies)!=2:raise ValueError('Two strategic plans required')
    for plan in strategies:
        if not isinstance(plan,dict) or any(plan.get(p) not in choices for p,choices in STAGE_OPTIONS.items()):
            raise ValueError('Invalid early/mid/late strategy')
    return squads,picks,bans,strategies

def draft_rosters(picks,bans):
    d=Draft()
    reserved=set(picks.values())
    ban_index=0
    while not d.done:
        kind,team,role=d.turn()
        if team==0:
            if kind=='ban':
                chosen=bans[ban_index];ban_index+=1
            else:chosen=picks[role]
            if not d.choose(chosen):
                raise ValueError(f'Illegal {kind}: {chosen}; this draft would make another role unplayable')
        else:
            legal=[x for x in KITS if d.legal(x) and x not in reserved]
            if not legal:raise ValueError('No legal AI pick/ban remaining')
            chosen=sorted(legal,key=lambda x:('Ashe','Sivir','Tristana').count(x),reverse=True)[0] if kind=='ban' else legal[0]
            if not d.choose(chosen):raise ValueError(f'AI draft failed on {chosen}')
    return d.roster(),d.banned

class StrategyMatch(Match):
    def __init__(self,seed,roster,strategies,squads):
        super().__init__(seed,roster=roster)
        self.strategies=strategies
        self.start_aggression={}
        self.phase_now=-1
        for team in (0,1):
            for role,u,card in zip(ROLES,self.players(team),squads[team]):
                u.player_id=card['id']
                u.player_name=card['name']
                u.player_overall=float(card['overall'])
                # OVR scales engine attributes but does not replace nexus-based victory.
                multiplier=max(.78,min(1.25,1+(float(card['overall'])-85)*.007))
                u.hp*=multiplier;u.maxhp*=multiplier;u.ad*=multiplier
                u.mechanics=min(.99,u.mechanics*multiplier)
                self.start_aggression[u.id]=u.aggression
    def damage(self,a,b,power,magic=False,true=False,spell=False,hit_kind=None,source=None):
        # Champion skill output grows continuously with the player's OVR.
        # Basic attacks are already OVR-scaled via Unit.ad.
        if spell and a.kind=='champion':
            rating=getattr(a,'player_overall',85)
            power*=max(.78,min(1.25,1+(rating-85)*.007))
        return super().damage(a,b,power,magic=magic,true=true,spell=spell,hit_kind=hit_kind,source=source)

    def phase(self):
        return 'early' if self.t<900 else 'mid' if self.t<1800 else 'late'
    def step(self):
        phase_id=0 if self.t<900 else 1 if self.t<1800 else 2
        if phase_id!=self.phase_now:
            self.phase_now=phase_id
            for team in (0,1):
                focus=self.strategies[team][self.phase()]
                for unit in self.players(team):
                    base=self.start_aggression[unit.id]
                    delta=.08 if focus=='TEAMFIGHT' else .04 if focus=='LANE' and unit.role!='JUNGLE' else -.035 if focus=='MACRO' else .055 if focus=='OBJECTIVE' and unit.role=='JUNGLE' else 0
                    unit.aggression=max(.15,min(.95,base+delta))
        super().step()
    def macro(self,team):
        original=super().macro(team)
        if original.get('kind') in ('수비','넥서스 공략'):return original
        focus=self.strategies[team][self.phase()]
        if focus=='LANE' and self.t<900:
            return dict(kind='라인전',p=self.terrain.snap(self.players(1-team)[0].home))
        if focus=='TEAMFIGHT' and self.t>=900:
            alive=[u for u in self.players(team) if u.alive and u.hp/u.maxhp>.55]
            mid=self.lane_waves.get((team,'MID'))
            if len(alive)>=3 and mid:return dict(kind='미드 집결',p=mid[0])
        if focus=='OBJECTIVE':
            for cfg in self.camps:
                if cfg['team']!=-1:continue
                boss=self.units[cfg['id']]
                if boss.alive and any(u.alive and u.role=='JUNGLE' and u.hp/u.maxhp>.55 for u in self.players(team)):
                    lanes=('MID','BOT') if boss.name=='Dragon' else ('TOP','MID')
                    return dict(kind='시야 준비',p=boss.pos,lanes=lanes)
        return original

def main():
    request=json.load(sys.stdin)
    teams,picks,bans,strategies=validate(request)
    roster,all_bans=draft_rosters(picks,bans)
    seed=request.get('seed',random.SystemRandom().randint(1,2147483647))
    if not isinstance(seed,int) or seed<0:raise ValueError('Invalid seed')
    match=StrategyMatch(seed,roster,strategies,teams)
    seconds=int(os.environ.get('RIFT_MAX_SIM_TIME','2400'))
    seconds=max(300,min(3600,seconds))
    while match.winner is None and match.t<seconds:
        match.step()
    result=match.result()
    featured=[event for event in match.events if event['type'] in ('kill','objective','structure','victory')]
    print(json.dumps(dict(result=result,bans=all_bans,roster=roster,
                          strategies=strategies,
                          timeline=featured[-150:],
                          engine='rift-rebuild/2026',
                          finished=match.winner is not None),ensure_ascii=False,separators=(',',':')))

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print(json.dumps(dict(error=str(exc)),ensure_ascii=False))
        sys.exit(1)
