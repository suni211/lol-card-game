import express, { Response } from 'express';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router=express.Router();
router.use(authMiddleware);
const ROLES=['TOP','JUNGLE','MID','ADC','SUPPORT'];
type Strategy={early:'LANE'|'OBJECTIVE';mid:'MACRO'|'TEAMFIGHT'|'OBJECTIVE';late:'MACRO'|'TEAMFIGHT'|'OBJECTIVE'};
type RequestPlan={cardIds:number[];enemyTeam:string;draft:{bans:string[];picks:Record<string,string>};strategies:Strategy};
type Job={id:string;owner:number;status:'QUEUED'|'RUNNING'|'COMPLETE'|'ERROR';payload:any;result?:any;error?:string;created:number;};
const jobs=new Map<string,Job>(),queue:Job[]=[];
const maxWorkers=Math.max(1,Math.min(3,Number(process.env.RIFT_WORKERS||2)));
let active=0;
const engineFolder=path.resolve(__dirname,'../../rift_engine');
function statusAvailable() { return require('fs').existsSync(path.join(engineFolder,'engine.py')) && require('fs').existsSync(path.join(engineFolder,'assets/map.png')); }
function cleanup() {
  for(const [id,job] of jobs)if((job.status==='COMPLETE'||job.status==='ERROR')&&Date.now()-job.created>4*3600000)jobs.delete(id);
}
function runNext() {
  while(active<maxWorkers && queue.length) {
    const job=queue.shift()!;active++;job.status='RUNNING';
    const python=process.env.RIFT_PYTHON || 'python3';
    const proc=spawn(python,[path.join(engineFolder,'bridge.py')],{cwd:engineFolder,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
    const parts:Buffer[]=[],errors:Buffer[]=[];
    let bytes=0;
    proc.stdout.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes<=8*1024*1024)parts.push(chunk);else proc.kill('SIGKILL');});
    proc.stderr.on('data',(chunk:Buffer)=>{if(Buffer.concat(errors).length<2048)errors.push(chunk);});
    proc.stdin.on('error',()=>{});
    proc.stdin.end(JSON.stringify(job.payload));
    const timeout=setTimeout(()=>proc.kill('SIGKILL'),Math.max(120000,Number(process.env.RIFT_TIMEOUT_MS||600000)));
    proc.on('error',(err)=>{job.status='ERROR';job.error='매치 엔진을 실행하지 못했습니다: '+err.message;});
    proc.on('close',(code)=>{
      clearTimeout(timeout);
      if(job.status!=='ERROR') {
        try{
          const value=JSON.parse(Buffer.concat(parts).toString('utf8'));
          if(code!==0 || value.error) throw Error(value.error || Buffer.concat(errors).toString('utf8').slice(0,400) || 'engine exit '+code);
          job.status='COMPLETE';job.result=value;
          void pool.query(
            `INSERT INTO rift_match_history (id,user_id,mode,finished,winner,match_data)
             VALUES (?,?,'AI',?,?,?)`,
            [job.id,job.owner,value.finished?1:0,value.result.winner===null?null:Number(value.result.winner),JSON.stringify(value)]
          ).catch(err=>console.error('Match history save failed',err));
        }catch(err:any){job.status='ERROR';job.error=err.message;}
      }
      active--;runNext();
    });
  }
}
async function getLineups(user:number,ids:any,enemyTeam:any){
  if(!Array.isArray(ids)||ids.length!==5||new Set(ids).size!==5||ids.some((v:any)=>!Number.isInteger(v)||v<=0))
    throw Error('서로 다른 선수 카드 5장을 선택하세요.');
  if(typeof enemyTeam!=='string'||!^[A-Z0-9.]{1,12}$/.test(enemyTeam))
    throw Error('상대 팀을 선택하세요.');
  const [own]:any=await pool.query(
    `SELECT uc.id AS cardId,p.id,p.name,p.team,p.position,p.overall,p.season,p.image_url AS imageUrl
     FROM user_cards uc JOIN players p ON p.id=uc.player_id
     WHERE uc.user_id=? AND uc.id IN (?,?,?,?,?) AND p.season IN ('26 LIVE','26WR','26WRs')`,
    [user,...ids]);
  const indexed=new Map(own.map((c:any)=>[c.cardId,c]));
  const team0=ids.map((id:number)=>indexed.get(id));
  if(team0.some((c:any)=>!c))throw Error('보유하지 않은 카드 또는 과거 시즌 카드가 있습니다.');
  for(let i=0;i<5;i++)if((team0[i] as any).position!==ROLES[i])throw Error(ROLES[i]+' 포지션에 맞는 카드를 선택하세요.');
  const [enemy]:any=await pool.query(
    `SELECT id,name,team,position,overall,season,image_url AS imageUrl FROM players
     WHERE season='26 LIVE' AND team=? AND position IN ('TOP','JUNGLE','MID','ADC','SUPPORT')
     ORDER BY FIELD(position,'TOP','JUNGLE','MID','ADC','SUPPORT'),overall DESC`,[enemyTeam]);
  const team1=ROLES.map(role=>enemy.find((p:any)=>p.position===role));
  if(team1.some(c=>!c))throw Error('상대 팀에 모든 포지션 선수가 없습니다.');
  return [team0,team1];
}
router.get('/opponents',async(_req,res:Response)=>{
  try{
    const [rows]:any=await pool.query(
      `SELECT team,COUNT(DISTINCT position) AS positions FROM players WHERE season='26 LIVE'
       GROUP BY team HAVING positions=5 ORDER BY team`);
    res.json({success:true,data:{teams:rows.map((r:any)=>r.team),engineReady:statusAvailable()}});
  }catch(err){res.status(500).json({success:false,error:'선수 DB를 조회할 수 없습니다.'});}
});
router.post('/preview',async(req:AuthRequest,res:Response)=>{
  try{
    const [own,enemy]=await getLineups(req.user!.id,req.body.cardIds,req.body.enemyTeam);
    const sum=(team:any[])=>team.reduce((n,c)=>n+Number(c.overall),0);
    const ours=sum(own),theirs=sum(enemy);
    res.json({success:true,data:{own,enemy,ownOverall:ours,enemyOverall:theirs,advantagePercent:Math.round(ours/(ours+theirs)*1000)/10,
      explanation:'카드 OVR 합계 기준 예상 우세도이며 실제 승패는 매치엔진에서 결정됩니다.'}});
  }catch(err:any){res.status(400).json({success:false,error:err.message});}
});
router.post('/start',async(req:AuthRequest,res:Response)=>{
  cleanup();
  try{
    if(!statusAvailable())return res.status(503).json({success:false,error:'서버에 rift-rebuild Python 엔진을 먼저 설치하세요.'});
    const body=req.body as RequestPlan;
    const [own,enemy]=await getLineups(req.user!.id,body.cardIds,body.enemyTeam);
    const {draft,strategies}=body;
    if(!draft||!Array.isArray(draft.bans)||draft.bans.length!==3||!draft.picks||
      ROLES.some(role=>typeof draft.picks[role]!=='string')||Object.keys(draft.picks).length!==5)
      throw Error('밴 3명과 각 포지션의 챔피언 픽 5개가 필요합니다.');
    const permitted=(p:any)=>p&&['early','mid','late'].every(phase=>
      (phase==='early'?['LANE','OBJECTIVE']:['MACRO','TEAMFIGHT','OBJECTIVE']).includes(p[phase]));
    if(!permitted(strategies)||!Array.isArray(strategies)||!permitted(strategies[0])||!permitted(strategies[1]))
      throw Error('초반·중반·후반 전략을 선택하세요.');
    if([...jobs.values()].some(j=>j.owner===req.user!.id&&(j.status==='QUEUED'||j.status==='RUNNING')))
      throw Error('이미 진행 중인 경기가 있습니다.');
    if(queue.length>=60) return res.status(429).json({success:false,error:'현재 경기 대기열이 가득 찼습니다.'});
    const request={teams:[own,enemy],draft,strategies,seed:Math.floor(Math.random()*2147483647)};
    const job:Job={id:randomUUID(),owner:req.user!.id,status:'QUEUED',payload:request,created:Date.now()};
    jobs.set(job.id,job);queue.push(job);runNext();
    res.status(202).json({success:true,data:{id:job.id,status:job.status}});
  }catch(err:any){res.status(400).json({success:false,error:err.message});}
});
router.get('/match/:id',async(req:AuthRequest,res:Response)=>{
  const job=jobs.get(req.params.id);
  if(!job||job.owner!==req.user!.id)return res.status(404).json({success:false,error:'해당 경기를 찾을 수 없습니다.'});
  res.json({success:true,data:{id:job.id,status:job.status,result:job.result,error:job.error,queuePosition:job.status==='QUEUED'?queue.indexOf(job)+1:0}});
});
export default router;
