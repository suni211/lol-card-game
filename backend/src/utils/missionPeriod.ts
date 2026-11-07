export type MissionPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

// Store MySQL DATETIME period keys in Korean calendar time. Do not depend
// on the Linux host's timezone or its MySQL session timezone.
export function periodEnd(period:MissionPeriod,now:Date=new Date()):string {
  const kst=new Date(now.getTime()+9*60*60*1000);
  const y=kst.getUTCFullYear(),m=kst.getUTCMonth(),d=kst.getUTCDate();
  let end:Date;
  if(period==='WEEKLY'){
    const daysToSunday=(7-kst.getUTCDay())%7;
    end=new Date(Date.UTC(y,m,d+daysToSunday,23,59,59));
  }else if(period==='MONTHLY'){
    end=new Date(Date.UTC(y,m+1,0,23,59,59));
  }else{
    end=new Date(Date.UTC(y,m,d,23,59,59));
  }
  return end.toISOString().slice(0,19).replace('T',' ');
}
export function periodExpiryIso(period:MissionPeriod,now:Date=new Date()):string {
  return periodEnd(period,now).replace(' ','T')+'+09:00';
}
