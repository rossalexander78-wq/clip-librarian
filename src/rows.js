// Splits the clip-matrix row array out of an MPC 3 project's JSON text and rebuilds it,
// leaving every other byte of the file untouched.
function findRowArray(text){ return findArray(text,'"sharedClipMatrixData":','This project has no clip matrix rows.'); }
function findTrackArray(text){ return findArray(text,'"tracks":','This project has no track list.'); }
function findArray(text,key,missing){
  const k=text.indexOf(key); if(k<0) throw new Error(missing);
  const open=text.indexOf('[',k+key.length);
  const items=[]; let depth=0, inStr=false, start=-1;
  for(let i=open+1;i<text.length;i++){
    const ch=text.charCodeAt(i);
    if(inStr){ if(ch===92){i++;continue;} if(ch===34) inStr=false; continue; }
    if(ch===34){inStr=true; continue;}
    if(ch===123||ch===91){ if(depth===0) start=i; depth++; }
    else if(ch===125||ch===93){
      if(depth===0){
        const close=i;
        const sep=items.length>1?text.slice(items[0][1],items[1][0]):',\n';
        const lead=items.length?text.slice(open+1,items[0][0]):'\n';
        const tail=items.length?text.slice(items[items.length-1][1],close):'\n';
        return {open,close,items,sep,lead,tail};
      }
      depth--; if(depth===0) items.push([start,i+1]);
    }
  }
  throw new Error('The clip matrix data is incomplete.');
}
const NAME_RE=/"name": "(?:[^"\\]|\\.)*"/;
function setFirst(t,from,re,val){
  const m=re.exec(t.slice(from)); if(!m) return t;
  const a=from+m.index; return t.slice(0,a)+val+t.slice(a+m[0].length);
}
const KEY_RE=/^\{\s*"key": ("(?:[^"\\]|\\.)*")/;
function clipEntries(t){ try{ return findArray(t,'"clips":',''); }catch(e){ return null; } }
// keep only the clips on the listed tracks
function keepClips(t,keep){ const a=clipEntries(t); if(!a) return t;
  const parts=a.items.map(([s,e])=>t.slice(s,e)).filter(x=>{ const m=KEY_RE.exec(x); return m&&keep.includes(JSON.parse(m[1])); });
  return t.slice(0,a.open+1)+arrayBody(a,parts)+t.slice(a.close); }
// replace one clip's notes and length: gen = {notes:[[time,note,vel,len]], len, loop?}
function setClipNotes(t,track,gen){ const a=clipEntries(t); if(!a) return t;
  for(const [s,e] of a.items){ const x=t.slice(s,e), m=KEY_RE.exec(x); if(!m||JSON.parse(m[1])!==track) continue;
    let y=x.replace(/"startPulses": \d+/,'"startPulses": 0').replace(/"endPulses": \d+/,'"endPulses": '+gen.len)
      .replace(/"loopStartPulses": \d+/,'"loopStartPulses": 0').replace(/"loopEndPulses": \d+/,'"loopEndPulses": '+gen.len);
    if(gen.loop!=null) y=y.replace(/"loop": (true|false)/,'"loop": '+(gen.loop?'true':'false'));
    const ev=findArray(y,'"events":','');
    const items=ev.items.map(([s2,e2])=>y.slice(s2,e2));
    const tpl=items.find(z=>/"type": 3,/.test(z)); if(!tpl) return t;
    const timeOf=z=>+(/"time": (\d+)/.exec(z)||[0,0])[1];
    const others=items.filter(z=>!/"type": 3,/.test(z)&&timeOf(z)<gen.len);
    const notes=gen.notes.map(([tm,nt,vel,ln])=>tpl.replace(/"time": \d+/,'"time": '+Math.max(0,Math.round(tm)))
      .replace(/"note": \d+/,'"note": '+Math.max(0,Math.min(127,Math.round(nt))))
      .replace(/"velocity": [-\d.eE+]+/,'"velocity": '+(Math.max(1,Math.min(127,Math.round(vel)))/127))
      .replace(/"length": \d+/,'"length": '+Math.max(1,Math.round(ln))));
    const all=others.concat(notes).map(z=>[timeOf(z),z]).sort((p,q)=>p[0]-q[0]).map(z=>z[1]);
    y=y.slice(0,ev.open+1)+arrayBody(ev,all)+y.slice(ev.close);
    return t.slice(0,s)+y+t.slice(e);
  }
  return t; }
// row: {src, name?, colour?, keep?: [trackName], clips?: {trackName: {name?, colour?, gen?}}}
function editRow(t,row){
  if(row.keep) t=keepClips(t,row.keep);
  if(row.clips) for(const [track,ed] of Object.entries(row.clips)) if(ed.gen) t=setClipNotes(t,track,ed.gen);
  if(row.clips){
    for(const [track,ed] of Object.entries(row.clips)){
      const k=t.indexOf('"key": '+JSON.stringify(track)); if(k<0) continue;
      if(ed.colour!=null) t=setFirst(t,k,/"colour": -?\d+/, '"colour": '+(ed.colour|0));
      if(ed.name!=null) t=setFirst(t,k,NAME_RE,'"name": '+JSON.stringify(ed.name));
    }
  }
  // the row's own fields come before its clips
  if(row.colour!=null) t=setFirst(t,0,/"optionalColour": -?\d+/,'"optionalColour": '+(row.colour|0));
  if(row.name!=null) t=setFirst(t,0,NAME_RE,'"name": '+JSON.stringify(row.name));
  return t;
}
function arrayBody(arr,parts){ return parts.length?arr.lead+parts.join(arr.sep)+arr.tail:''; }
function rebuild(text,arr,rows,tarr,trackOrder){
  // rows array comes after the track list in the file, so replace it first and the earlier offsets stay valid
  const parts=rows.map(r=>editRow(text.slice(arr.items[r.src][0],arr.items[r.src][1]),r));
  let out=text.slice(0,arr.open+1)+arrayBody(arr,parts)+text.slice(arr.close);
  if(tarr&&trackOrder&&tarr.open<arr.open){
    const tparts=trackOrder.map(i=>text.slice(tarr.items[i][0],tarr.items[i][1]));
    out=out.slice(0,tarr.open+1)+arrayBody(tarr,tparts)+out.slice(tarr.close);
  }
  // when rows were removed, row numbers the MPC remembers (last selected row, playing clips, matrix scroll) could point past the end
  if(rows.length!==arr.items.length || rows.some((r,i)=>r.src!==i)){
    out=out.replace(/"currentClipRow": (-?\d+)/,(m,n)=>'"currentClipRow": '+Math.max(0,Math.min(+n,rows.length-1)));
    out=out.replace(/"originY": \d+/g,'"originY": 0');
    try{ const t=findArray(out,'"trackClipTransportMap":','');
      out=out.slice(0,t.open+1)+out.slice(t.close); }catch(e){}
  }
  return out;
}
if(typeof module!=='undefined') module.exports={findRowArray,findTrackArray,rebuild};
