'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FlaskConical, Heart, RotateCcw, Shield, Skull, Sparkles, Swords } from 'lucide-react';

type Ingredient = { id: string; name: string; mark: string; hint: string; tone: string };
type Effect = '侵蚀' | '治愈' | '庇护';
type Result = { effect: Effect; power: number; risk: string; omen: string; color: string; sigil: string };

const INGREDIENTS: Ingredient[] = [
  { id: 'heart', name: '火蜥心脏', mark: '焰', hint: '炽热、旺盛、难以控制', tone: '#e2663d' },
  { id: 'moon', name: '月光粉', mark: '月', hint: '净化幻象，也会放大秘密', tone: '#b7b9ff' },
  { id: 'mirror', name: '碎镜片', mark: '镜', hint: '复制一切，包括代价', tone: '#95d8e8' },
  { id: 'tear', name: '人鱼泪', mark: '泪', hint: '缝合伤口，留下依恋', tone: '#5db7a6' },
  { id: 'feather', name: '乌鸦羽', mark: '羽', hint: '预兆、迅捷与凋零', tone: '#9a8fb7' },
  { id: 'shadow', name: '无名之影', mark: '影', hint: '藏匿形迹，侵蚀人格', tone: '#7e778d' },
];

const METHODS = [
  { id: 'grind', name: '研磨', note: '主效果更清晰' },
  { id: 'distill', name: '蒸馏', note: '压低副作用' },
  { id: 'burn', name: '燃烧', note: '威力更高，但更危险' },
];

const ENEMIES = [
  { name: '噬灯蛾群', intent: '下一回合：啃食 4 点生命', hp: 9 },
  { name: '无面收税人', intent: '下一回合：夺走护盾并造成 5 点伤害', hp: 13 },
  { name: '黑月侍从', intent: '下一回合：降下 7 点月蚀', hp: 17 },
];

function resolvePotion(ids: string[], method: string): Result {
  const attack = ids.filter((id) => ['heart', 'feather', 'shadow'].includes(id)).length;
  const heal = ids.filter((id) => ['tear', 'moon'].includes(id)).length;
  const ward = ids.filter((id) => ['mirror', 'moon'].includes(id)).length;
  let effect: Effect = attack >= heal && attack >= ward ? '侵蚀' : heal >= ward ? '治愈' : '庇护';
  if (ids.includes('mirror') && ids.includes('heart')) effect = '庇护';
  const base = 3 + ids.length + (method === 'burn' ? 3 : method === 'grind' ? 1 : 0);
  const unstable = ids.includes('shadow') || ids.includes('mirror') || method === 'burn';
  const risk = method === 'distill' ? '轻微反噬' : unstable ? '影子反噬' : '反应稳定';
  const omens: Record<Effect, string> = {
    侵蚀: '赤色烟羽扑向瓶壁，花纹从边缘迅速枯黑。',
    治愈: '青绿液体缝合一道裂痕，随后生出细小珍珠。',
    庇护: '银色液面凝成镜壳，火星撞上后折返消散。',
  };
  return { effect, power: base, risk, omen: omens[effect] + (risk === '影子反噬' ? ' 一道影子却离开瓶身，盯住了你。' : ''), color: effect === '侵蚀' ? '#dc6039' : effect === '治愈' ? '#49ad91' : '#8589db', sigil: effect === '侵蚀' ? '☄' : effect === '治愈' ? '✦' : '◈' };
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState('grind');
  const [phase, setPhase] = useState<'choose' | 'brewing' | 'read' | 'use' | 'end'>('choose');
  const [progress, setProgress] = useState(0);
  const [stability, setStability] = useState(42);
  const [result, setResult] = useState<Result | null>(null);
  const [guess, setGuess] = useState<Effect | null>(null);
  const [playerHp, setPlayerHp] = useState(18);
  const [enemyHp, setEnemyHp] = useState(ENEMIES[0].hp);
  const [room, setRoom] = useState(0);
  const [shield, setShield] = useState(0);
  const [metrics, setMetrics] = useState({ brews: 0, reads: 0, changed: 0 });
  const [changed, setChanged] = useState<boolean | null>(null);
  const enemy = ENEMIES[room] ?? ENEMIES[2];
  const ready = selected.length >= 2;
  const selectedItems = useMemo(() => INGREDIENTS.filter((item) => selected.includes(item.id)), [selected]);

  useEffect(() => {
    if (phase !== 'brewing') return;
    const timer = window.setInterval(() => setProgress((p) => Math.min(100, p + 4)), 108);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'brewing' && progress >= 100) {
      setResult(resolvePotion(selected, method));
      setPhase('read');
    }
  }, [progress, phase, selected, method]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'start_alchemy_trial',
      title: '开始新的炼金试炼',
      description: '重置当前进度并开始一局新的午夜炼金室试炼。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        setStarted(true); setSelected([]); setMethod('grind'); setPhase('choose'); setProgress(0); setResult(null); setGuess(null);
        setPlayerHp(18); setShield(0); setRoom(0); setEnemyHp(ENEMIES[0].hp); setMetrics({ brews: 0, reads: 0, changed: 0 }); setChanged(null);
        return { status: 'started', room: 1, playerHp: 18 };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function toggleIngredient(id: string) {
    if (phase !== 'choose') return;
    setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : current.length < 3 ? [...current, id] : current);
  }
  function brew() { if (ready) { setProgress(0); setStability(42); setGuess(null); setChanged(null); setPhase('brewing'); } }
  function stabilize() { if (phase === 'brewing') setStability((s) => Math.min(100, s + 13)); }
  function interpret(value: Effect) { setGuess(value); setMetrics((m) => ({ ...m, reads: m.reads + (value === result?.effect ? 1 : 0) })); setPhase('use'); }

  function applyPotion(target: 'enemy' | 'self' | 'seal') {
    if (!result) return;
    let nextPlayer = playerHp, nextEnemy = enemyHp, nextShield = shield;
    if (target === 'enemy') {
      if (result.effect === '侵蚀') nextEnemy -= result.power;
      else if (result.effect === '治愈') nextEnemy += Math.ceil(result.power / 2);
      else nextEnemy += 1;
    }
    if (target === 'self') {
      if (result.effect === '治愈') nextPlayer = Math.min(18, nextPlayer + result.power);
      else if (result.effect === '庇护') nextShield += result.power;
      else nextPlayer -= Math.ceil(result.power / 2);
    }
    if (target === 'seal') nextShield += 2;
    if (result.risk === '影子反噬' && stability < 80) nextPlayer -= 2;
    if (nextEnemy > 0) { const incoming = room === 2 ? 7 : 4 + room; const absorbed = Math.min(nextShield, incoming); nextShield -= absorbed; nextPlayer -= incoming - absorbed; }
    setMetrics((m) => ({ ...m, brews: m.brews + 1 }));
    if (nextPlayer <= 0) { setPlayerHp(0); setPhase('end'); return; }
    if (nextEnemy <= 0) {
      if (room >= ENEMIES.length - 1) { setEnemyHp(0); setPhase('end'); return; }
      const nextRoom = room + 1; setRoom(nextRoom); setEnemyHp(ENEMIES[nextRoom].hp);
    } else setEnemyHp(nextEnemy);
    setPlayerHp(nextPlayer); setShield(nextShield); setSelected([]); setResult(null); setPhase('choose');
  }

  function restart() {
    setStarted(true); setSelected([]); setMethod('grind'); setPhase('choose'); setProgress(0); setResult(null); setGuess(null);
    setPlayerHp(18); setShield(0); setRoom(0); setEnemyHp(ENEMIES[0].hp); setMetrics({ brews: 0, reads: 0, changed: 0 }); setChanged(null);
  }

  if (!started) return <main className="start-screen"><div className="moon" aria-hidden="true" /><section className="start-card"><p className="eyebrow">黑月历 103 年 · 禁药试炼</p><h1>午夜炼金室</h1><p className="lead">在坩埚的异象中辨认药效。三名黑月造物正在逼近，而你只有尚未命名的药。</p><div className="rules"><span>选 2–3 种材料</span><span>稳住反应</span><span>读懂异象</span><span>决定给谁喝</span></div><Button className="start-button" onClick={() => setStarted(true)}>点燃坩埚 <Sparkles /></Button><p className="fine">本原型用生成式动效模拟 2.7 秒视频返回，验证“异象是否影响决策”。</p></section></main>;

  if (phase === 'end') {
    const won = enemyHp <= 0;
    return <main className="end-screen"><section className="end-card"><p className="eyebrow">试炼记录</p><h1>{won ? '黑月暂时闭上了眼' : '炼金灯熄灭了'}</h1><p className="lead">你完成了 {metrics.brews} 次炼金，准确读懂 {metrics.reads} 次异象，其中 {metrics.changed} 次改变了原计划。</p><div className="metric-grid"><div><b>{metrics.brews}</b><span>生成次数</span></div><div><b>{metrics.brews ? Math.round(metrics.reads / metrics.brews * 100) : 0}%</b><span>异象识别率</span></div><div><b>{metrics.brews ? Math.round(metrics.changed / metrics.brews * 100) : 0}%</b><span>决策影响率</span></div></div><Button className="start-button" onClick={restart}><RotateCcw /> 再试一炉</Button></section></main>;
  }

  return <main className="game-shell">
    <header className="topbar"><div><p className="eyebrow">午夜炼金室</p><h1>黑月试炼</h1></div><div className="status"><span><Heart /> {playerHp}/18</span><span><Shield /> {shield}</span><span>第 {room + 1}/3 室</span></div></header>
    <div className="game-grid">
      <section className="enemy-panel"><div className="enemy-art" data-room={room}><div className="enemy-eye" /><div className="enemy-body">{room === 0 ? '༺' : room === 1 ? '◉' : '♜'}</div></div><p className="eyebrow">拦路者</p><h2>{enemy.name}</h2><div className="health-track"><i style={{ width: `${Math.max(0, enemyHp / enemy.hp * 100)}%` }} /></div><p className="enemy-hp">{Math.max(0, enemyHp)} / {enemy.hp}</p><p className="intent"><Swords /> {enemy.intent}</p></section>
      <section className="workbench">
        {phase === 'choose' && <><div className="section-head"><div><p className="step">步骤 01</p><h2>选择材料</h2></div><p>至少 2 种，最多 3 种</p></div><div className="ingredients">{INGREDIENTS.map((item) => <button key={item.id} className={`ingredient ${selected.includes(item.id) ? 'selected' : ''}`} onClick={() => toggleIngredient(item.id)} style={{ '--tone': item.tone } as React.CSSProperties}><span className="mark">{item.mark}</span><b>{item.name}</b><small>{item.hint}</small></button>)}</div><div className="method-row"><div><p className="step">步骤 02</p><h2>选择工艺</h2></div><div className="method-buttons">{METHODS.map((m) => <button className={method === m.id ? 'active' : ''} key={m.id} onClick={() => setMethod(m.id)}><b>{m.name}</b><small>{m.note}</small></button>)}</div></div><div className="brew-row"><div className="slots">{[0,1,2].map((i) => <span key={i} className={selectedItems[i] ? 'filled' : ''}>{selectedItems[i]?.mark ?? '空'}</span>)}</div><Button className="brew-button" disabled={!ready} onClick={brew}><FlaskConical /> 开始炼金</Button></div></>}
        {phase === 'brewing' && <div className="brew-stage"><p className="step">异象生成中 · 约 2.7 秒</p><h2>保持坩埚稳定</h2><div className="cauldron brewing"><div className="liquid" style={{ height: `${35 + progress / 3}%` }} /><div className="bubbles">✦ · ◌ · ✧</div></div><div className="progress"><i style={{ width: `${progress}%` }} /></div><p>稳定度 {stability}%</p><Button className="stabilize" onClick={stabilize}>点击符印稳定反应</Button></div>}
        {(phase === 'read' || phase === 'use') && result && <div className="omen-stage"><p className="step">步骤 03 · 观察异象</p><div className="vision" style={{ '--potion': result.color } as React.CSSProperties}><div className="vision-noise" /><div className="sigil">{result.sigil}</div><div className="shadow-omen" /></div><p className="omen-copy">{result.omen}</p>{phase === 'read' && <><h2>你认为主效果是什么？</h2><div className="guess-grid"><button onClick={() => interpret('侵蚀')}><Skull />侵蚀</button><button onClick={() => interpret('治愈')}><Heart />治愈</button><button onClick={() => interpret('庇护')}><Shield />庇护</button></div></>}{phase === 'use' && <div className="use-stage"><div className={`verdict ${guess === result.effect ? 'correct' : 'wrong'}`}>{guess === result.effect ? '判断正确' : `判断偏差：实际为${result.effect}`}<span>强度 {result.power} · {result.risk}</span></div><p className="question">这段异象改变了你原本的使用计划吗？</p><div className="binary"><button className={changed === true ? 'active' : ''} onClick={() => { setChanged(true); setMetrics(m => ({...m, changed:m.changed + (changed === true ? 0 : 1)})); }}>改变了</button><button className={changed === false ? 'active' : ''} onClick={() => { if(changed === true) setMetrics(m => ({...m, changed:Math.max(0,m.changed-1)})); setChanged(false); }}>没有</button></div><h2>如何处置这瓶药？</h2><div className="use-grid"><Button disabled={changed === null} onClick={() => applyPotion('enemy')}>泼向敌人</Button><Button disabled={changed === null} variant="outline" onClick={() => applyPotion('self')}>自己喝下</Button><Button disabled={changed === null} variant="outline" onClick={() => applyPotion('seal')}>封存换护盾</Button></div></div>}</div>}
      </section>
      <aside className="codex"><p className="eyebrow">炼金笔记</p><h2>已知征兆</h2><ul><li><i className="red" />赤色烟羽：倾向侵蚀</li><li><i className="green" />裂痕缝合：倾向治愈</li><li><i className="violet" />镜壳折返：倾向庇护</li><li><i className="black" />影子离瓶：可能反噬</li></ul><div className="run-data"><span>本局炼金 <b>{metrics.brews}</b></span><span>读懂异象 <b>{metrics.reads}</b></span><span>改变决策 <b>{metrics.changed}</b></span></div></aside>
    </div>
  </main>;
}

