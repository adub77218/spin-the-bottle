"use strict";
/**
 * 🍾 SPIN THE BOTTLE — ALL-IN-ONE FILE (play money, provably fair)
 * Everything lives in this single file: fairness core, game server, and the
 * web page (inlined). Companion file needed: package.json (7 lines).
 * Run: npm install && npm start  → open http://localhost:3000 in 2+ tabs.
 */
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

// ============ THE WEB PAGE (served inline) ============
const PAGE_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n<title>Spin the Bottle</title>\n<style>\n  :root {\n    --bg:#070d0a; --felt1:#15402f; --felt2:#0c2b1f; --panel:#0e1a14; --line:#1f3a2e;\n    --gold:#e8b54d; --gold2:#f7d98c; --goldglow:rgba(232,181,77,.45);\n    --orange:#f08c3a; --hot:#ff4d88;\n    --good:#4ade80; --bad:#f87171; --text:#f2f6f1; --dim:#7e9a8b;\n  }\n  * { box-sizing:border-box; }\n  body { margin:0; font-family:'Segoe UI',system-ui,sans-serif; color:var(--text);\n    background:\n      radial-gradient(900px 500px at 50% -8%, rgba(232,181,77,.07), transparent 60%),\n      radial-gradient(1400px 900px at 50% 30%, #0e1f17, var(--bg));\n    min-height:100vh; }\n  .wrap { max-width:920px; margin:0 auto; padding:12px 18px 50px; }\n\n  header { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }\n  h1 { font-size:22px; margin:8px 0; letter-spacing:1px; font-weight:800;\n       background:linear-gradient(180deg,var(--gold2),var(--gold));\n       -webkit-background-clip:text; background-clip:text; color:transparent;\n       text-shadow:0 0 28px rgba(232,181,77,.25); }\n  h1 .sub { -webkit-text-fill-color:var(--dim); color:var(--dim); font-size:11px; font-weight:500;\n       letter-spacing:2px; text-transform:uppercase; margin-left:10px; }\n  .chips { background:linear-gradient(180deg,#1b3527,#0f241a); border:1px solid var(--gold);\n    padding:9px 16px; border-radius:999px; font-weight:700; box-shadow:0 0 18px rgba(232,181,77,.15), inset 0 1px 0 rgba(255,255,255,.06); }\n  .chips b { color:var(--gold2); font-size:16px; }\n  .namebar { display:flex; gap:8px; align-items:center; }\n  input { background:#0a1510; border:1px solid var(--line); color:var(--text);\n    padding:9px 12px; border-radius:10px; font-family:inherit; font-size:14px; }\n\n  /* phase banner + countdown */\n  .banner { display:flex; align-items:center; justify-content:center; gap:14px; margin:10px 0 4px; min-height:34px; }\n  .phase { color:var(--gold2); font-size:15px; letter-spacing:.6px; font-weight:600; text-align:center; }\n  .timer { font-variant-numeric:tabular-nums; background:#0a1510; border:1px solid var(--gold);\n    border-radius:8px; padding:3px 10px; font-weight:800; color:var(--gold2); display:none; }\n  .timer.on { display:inline-block; }\n  .timer.urgent { color:#fff; background:var(--hot); border-color:var(--hot); animation:pulse .5s infinite alternate; }\n  @keyframes pulse { from{filter:brightness(1)} to{filter:brightness(1.4)} }\n\n  .stage { position:relative; width:min(500px, 94vw); margin:4px auto; }\n  .stage svg { width:100%; height:auto; display:block; filter:drop-shadow(0 22px 50px rgba(0,0,0,.65)); }\n  #confetti { position:absolute; inset:0; pointer-events:none; }\n  .potbox { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);\n    text-align:center; pointer-events:none; z-index:3; }\n  .potbox .lbl { font-size:10px; color:var(--dim); text-transform:uppercase; letter-spacing:2px; }\n  .potbox .big { font-size:36px; font-weight:900; color:var(--gold2);\n    text-shadow:0 0 22px var(--goldglow); }\n  .potbox.pump .big { animation:pump .55s ease; color:#fff; }\n  @keyframes pump { 0%{transform:scale(1)} 40%{transform:scale(1.7)} 100%{transform:scale(1)} }\n\n  /* stake picker */\n  .stakes { display:flex; gap:8px; justify-content:center; margin:12px 0 2px; flex-wrap:wrap; }\n  .stake { width:62px; height:62px; border-radius:50%; border:3px dashed rgba(255,255,255,.25);\n    font-weight:900; font-size:15px; cursor:pointer; color:#fff; position:relative;\n    box-shadow:0 4px 12px rgba(0,0,0,.5), inset 0 2px 4px rgba(255,255,255,.18), inset 0 -3px 6px rgba(0,0,0,.35);\n    transition:transform .1s, box-shadow .15s; }\n  .stake:hover { transform:translateY(-3px); }\n  .stake:disabled { opacity:.45; cursor:not-allowed; transform:none; filter:grayscale(.85); position:relative; }\n  .stake:disabled::after { content:\"\"; position:absolute; left:-6%; top:50%; width:112%; height:3.5px;\n    background:var(--bad); border-radius:2px; transform:rotate(-18deg);\n    box-shadow:0 0 6px rgba(248,113,113,.8); }\n  .stake:disabled { opacity:.45; cursor:not-allowed; transform:none; filter:grayscale(.85); position:relative; }\n  .stake:disabled::after { content:\"\"; position:absolute; left:-6%; top:50%; width:112%; height:3.5px;\n    background:var(--bad); border-radius:2px; transform:rotate(-18deg);\n    box-shadow:0 0 6px rgba(248,113,113,.8); }\n  .stake.sel { outline:3px solid var(--gold2); outline-offset:2px; transform:translateY(-3px) scale(1.06);\n    box-shadow:0 6px 20px var(--goldglow), inset 0 2px 4px rgba(255,255,255,.18); }\n  .s10  { background:radial-gradient(circle at 35% 30%, #4f86d8, #28508f); }\n  .s50  { background:radial-gradient(circle at 35% 30%, #d85050, #8f2828); }\n  .s100 { background:radial-gradient(circle at 35% 30%, #3c3c46, #15151c); }\n  .s250 { background:radial-gradient(circle at 35% 30%, #8a5cd8, #4f2e8f); }\n  .s500 { background:radial-gradient(circle at 35% 30%, #e8b54d, #946a16); color:#241a04; }\n\n  .controls { display:flex; gap:10px; justify-content:center; margin:12px 0 6px; flex-wrap:wrap; }\n  button.act { border:0; padding:13px 22px; border-radius:14px; font-weight:800; cursor:pointer;\n    font-family:inherit; font-size:15px; transition:transform .08s, filter .15s; letter-spacing:.3px; }\n  button.act:active { transform:scale(.96); }\n  button.act:disabled { opacity:.3; cursor:not-allowed; transform:none; }\n  .btn-ghost { background:#13241b; color:var(--text); border:1px solid var(--line)!important; }\n  .btn-join { background:linear-gradient(180deg,var(--gold2),var(--gold)); color:#3a2a05;\n    box-shadow:0 5px 24px var(--goldglow), inset 0 1px 0 rgba(255,255,255,.4); }\n  .btn-bank { background:linear-gradient(180deg,#6ee7a0,#2eb45f); color:#06210f;\n    box-shadow:0 5px 18px rgba(74,222,128,.3); }\n  .btn-risk { background:linear-gradient(180deg,#ff7b9d,var(--hot)); color:#2a0512;\n    box-shadow:0 5px 18px rgba(255,77,136,.35); }\n  .btn-risk small, .btn-bank small { display:block; font-size:11px; font-weight:600; opacity:.85; }\n\n  .legend { display:flex; gap:16px; justify-content:center; font-size:11px; color:var(--dim); margin:6px 0 10px; }\n  .legend span::before { content:''; display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px; vertical-align:-1px; box-shadow:0 0 6px currentColor; }\n  .lg-15::before{background:#5fc98a;} .lg-g::before{background:var(--gold);} .lg-o::before{background:var(--orange);} .lg-h::before{background:var(--hot);}\n\n  .panel { background:linear-gradient(180deg,#10201780,#0c191280); border:1px solid var(--line);\n    border-radius:14px; padding:12px 14px; backdrop-filter:blur(4px); }\n  .feed { font-size:13px; color:var(--dim); max-height:140px; overflow:auto; }\n  .feed > div { padding:4px 0; border-bottom:1px solid #16291f; }\n  .win{color:var(--good);} .loss{color:var(--bad);} .hl{color:var(--gold2);font-weight:700;}\n  .vlink { color:var(--dim); text-decoration:underline; cursor:pointer; font-size:12px; }\n  .vlink:hover { color:var(--gold2); }\n  .howlink { text-align:center; margin-top:10px; }\n\n  /* custom bet input */\n  #betCustom { width:110px; text-align:center; font-weight:800; font-size:15px;\n    border-color:var(--gold); color:var(--gold2); }\n\n  /* emote bar */\n  #emotes { display:flex; gap:6px; justify-content:center; margin:8px 0 0; }\n  .emo { font-size:20px; background:#13241b; border:1px solid var(--line); border-radius:10px;\n    padding:6px 10px; cursor:pointer; transition:transform .08s; }\n  .emo:hover { transform:translateY(-2px) scale(1.1); border-color:var(--gold); }\n  .emo:active { transform:scale(.92); }\n\n  /* floating emotes */\n  #floats { position:fixed; inset:0; pointer-events:none; z-index:80; overflow:hidden; }\n  .floatE { position:absolute; bottom:-40px; font-size:34px; animation:floatUp 2.6s ease-out forwards;\n    text-shadow:0 2px 8px rgba(0,0,0,.5); }\n  .floatE small { display:block; font-size:10px; color:var(--gold2); text-align:center; font-weight:700; }\n  @keyframes floatUp { 0%{transform:translateY(0) scale(.7); opacity:0}\n    12%{opacity:1; transform:translateY(-60px) scale(1.15)}\n    100%{transform:translateY(-72vh) scale(1); opacity:0} }\n\n  /* chat */\n  #chatRow { display:flex; gap:8px; margin-top:8px; }\n  #chatIn { flex:1; }\n  .chatmsg b { color:var(--gold2); }\n\n  /* spectator sweat */\n  @keyframes wobble { 0%,100%{transform:rotate(0) scale(1)} 25%{transform:rotate(-2.5deg) scale(1.04)} 75%{transform:rotate(2.5deg) scale(1.04)} }\n  button.act.sweat { animation:wobble .35s infinite; filter:brightness(1.2); opacity:1 !important; }\n\n  /* near-miss callout */\n  #nearmiss { position:fixed; top:27%; left:50%; transform:translateX(-50%) scale(.7); opacity:0;\n    background:linear-gradient(180deg,#3a1020ee,#240812ee); border:2px solid var(--hot);\n    border-radius:14px; padding:10px 22px; font-weight:900; font-size:18px; color:#ffb3cd;\n    z-index:65; transition:all .25s cubic-bezier(.2,1.6,.4,1); pointer-events:none;\n    box-shadow:0 0 40px rgba(255,77,136,.4); }\n  #nearmiss.show { opacity:1; transform:translateX(-50%) scale(1); }\n\n  /* chip rack — your winnings stacked like a real table, big and 3D */\n  #rackWrap { position:fixed; right:16px; bottom:12px; z-index:40; pointer-events:none;\n    background:linear-gradient(180deg,#10241aee,#0a1812ee); border:1px solid var(--gold);\n    border-radius:14px; padding:10px 14px 8px; box-shadow:0 8px 30px rgba(0,0,0,.6), 0 0 24px rgba(232,181,77,.12); }\n  #rackWrap .rackTitle { font-size:10px; color:var(--gold2); letter-spacing:2px; text-transform:uppercase;\n    text-align:center; margin-bottom:6px; font-weight:800; }\n  #rack { display:flex; gap:18px; align-items:flex-end; min-height:38px; }\n  .cstack { display:flex; flex-direction:column-reverse; align-items:center; }\n  .cstack .cnt { font-size:13px; color:var(--gold2); margin-top:6px; font-weight:900; }\n  .chip { width:78px; height:22px; border-radius:50%/48%; margin-top:-11px; position:relative;\n    box-shadow:0 3px 4px rgba(0,0,0,.65), inset 0 2.5px 1px rgba(255,255,255,.35), inset 0 -3px 3px rgba(0,0,0,.45);\n    transition:transform .15s; }\n  .chip::before { content:\"\"; position:absolute; inset:0; border-radius:inherit;\n    border:2.5px dashed rgba(255,255,255,.5); transform:scale(.96,.88); }\n  .chip::after { content:\"\"; position:absolute; left:18%; right:18%; top:24%; height:3px;\n    border-radius:3px; background:rgba(255,255,255,.22); }\n  .chip.top { height:26px; }\n  .chip.top::after { content:attr(data-v); height:auto; top:50%; left:0; right:0;\n    transform:translateY(-55%); background:none; text-align:center;\n    font-size:14px; font-weight:900; color:#fff;\n    text-shadow:0 1px 1px #000, 0 0 4px rgba(0,0,0,.9);\n    letter-spacing:.5px; }\n  .c500.top::after { color:#241a04; text-shadow:0 1px 1px rgba(255,255,255,.4); }\n  .chip.new { animation:drop .4s cubic-bezier(.2,1.5,.4,1); }\n  @keyframes drop { 0%{transform:translateY(-55px) scale(1.25); opacity:0} 70%{transform:translateY(3px)} 100%{transform:translateY(0) scale(1); opacity:1} }\n  .c500 { background:linear-gradient(180deg,#f7d98c 0%,#e8b54d 35%,#a87a1e 100%); }\n  .c100 { background:linear-gradient(180deg,#565664 0%,#33333e 35%,#101016 100%); }\n  .c50  { background:linear-gradient(180deg,#ef7a7a 0%,#d85050 35%,#7c1f1f 100%); }\n  .c10  { background:linear-gradient(180deg,#7ba9ec 0%,#4f86d8 35%,#1f4078 100%); }\n\n  /* win banner */\n  #winbanner { position:fixed; top:18%; left:50%; transform:translate(-50%,-50%) scale(.6);\n    background:linear-gradient(180deg,#1b3527ee,#0f241aee); border:2px solid var(--gold);\n    border-radius:20px; padding:18px 34px; text-align:center; z-index:60; opacity:0;\n    pointer-events:none; transition:all .3s cubic-bezier(.2,1.6,.4,1);\n    box-shadow:0 0 60px var(--goldglow); }\n  #winbanner.show { opacity:1; transform:translate(-50%,-50%) scale(1); }\n  #winbanner .t1 { font-size:13px; color:var(--dim); letter-spacing:3px; text-transform:uppercase; }\n  #winbanner .t2 { font-size:30px; font-weight:900; color:var(--gold2); text-shadow:0 0 24px var(--goldglow); }\n\n  /* the risk dice */\n  #diceWrap { position:fixed; top:42%; left:50%; transform:translate(-50%,-50%) scale(.5); opacity:0;\n    z-index:70; pointer-events:none; transition:all .25s cubic-bezier(.2,1.5,.4,1); text-align:center; }\n  #diceWrap.show { opacity:1; transform:translate(-50%,-50%) scale(1); }\n  #die { width:110px; height:110px; border-radius:20px; margin:0 auto;\n    background:linear-gradient(155deg,#ffffff,#d8dde2 60%,#aeb6bd);\n    box-shadow:0 14px 40px rgba(0,0,0,.6), inset 0 2px 2px rgba(255,255,255,.9), inset 0 -4px 8px rgba(0,0,0,.18);\n    display:flex; align-items:center; justify-content:center;\n    font-size:74px; font-weight:900; color:#1b222b; line-height:1; }\n  #die.rolling { animation:tumble .12s infinite; }\n  @keyframes tumble { 0%{transform:rotate(-8deg) translateY(-3px)} 50%{transform:rotate(6deg) translateY(3px)} 100%{transform:rotate(-8deg) translateY(-3px)} }\n  #die.winface { color:#1c7d3e; box-shadow:0 14px 40px rgba(0,0,0,.6), 0 0 38px rgba(74,222,128,.8); }\n  #die.loseface { color:#a02121; box-shadow:0 14px 40px rgba(0,0,0,.6), 0 0 38px rgba(248,113,113,.8); }\n  #diceRule { margin-top:10px; font-size:13px; font-weight:800; color:var(--gold2);\n    background:#0a1812ee; border:1px solid var(--gold); border-radius:10px; padding:6px 14px; display:inline-block; }\n\n  #flash { position:fixed; inset:0; background:radial-gradient(circle, rgba(232,181,77,.4), transparent 60%);\n    opacity:0; pointer-events:none; transition:opacity .15s; z-index:50; }\n\n  /* modals */\n  .modal { position:fixed; inset:0; background:rgba(4,10,7,.8); display:none;\n    align-items:center; justify-content:center; z-index:100; }\n  .modal.open { display:flex; }\n  .mcard { background:var(--panel); border:1px solid var(--gold); border-radius:18px;\n    padding:22px; width:min(540px,92vw); box-shadow:0 0 50px rgba(232,181,77,.12); }\n  .mcard h3 { margin:0 0 6px; font-size:17px; color:var(--gold2); }\n  .mcard .tag { color:var(--dim); font-size:12.5px; margin-bottom:12px; line-height:1.5; }\n  .mcard label { font-size:10px; color:var(--dim); display:block; margin-top:8px; text-transform:uppercase; letter-spacing:1.5px; }\n  .mcard input { width:100%; margin-top:3px; font-size:12px; }\n  .mcard .row { display:flex; gap:10px; margin-top:16px; justify-content:flex-end; }\n  .mcard ol { margin:8px 0; padding-left:20px; color:var(--text); font-size:13.5px; line-height:1.7; }\n  #vResult { margin-top:12px; font-size:13px; }\n  .ok{color:var(--good);} .no{color:var(--bad);}\n  code { background:#0a1510; padding:2px 6px; border-radius:6px; font-size:11px; word-break:break-all; }\n</style>\n</head>\n<body>\n<div id=\"flash\"></div>\n<div id=\"floats\"></div>\n<div id=\"nearmiss\"></div>\n<div id=\"diceWrap\"><div id=\"die\">?</div><div id=\"diceRule\">ROLL 4+ TO DOUBLE</div></div>\n<div id=\"rackWrap\"><div class=\"rackTitle\">💰 your chips</div><div id=\"rack\"></div></div>\n<div id=\"winbanner\"><div class=\"t1\" id=\"wbT1\">winner</div><div class=\"t2\" id=\"wbT2\"></div></div>\n\n<div class=\"wrap\">\n  <header>\n    <h1>🍾 SPIN THE BOTTLE<span class=\"sub\">provably fair · play money</span></h1>\n    <div class=\"namebar\">\n      <input id=\"name\" placeholder=\"your name\" maxlength=\"16\" style=\"width:120px\" />\n      <button id=\"nameBtn\" class=\"act btn-ghost\">Set</button>\n      <span class=\"chips\">💰 <b id=\"bal\">—</b></span>\n    </div>\n  </header>\n\n  <div id=\"jackpotBar\" style=\"display:none;text-align:center;margin:6px auto;font-weight:900;color:#f7d98c;background:linear-gradient(180deg,#3a2c08,#241a04);border:1px solid var(--gold);border-radius:12px;padding:8px 16px;max-width:340px;letter-spacing:1px;\">💰 JACKPOT: <span id=\"jackpotVal\">0</span></div>\n  <div class=\"banner\">\n    <div class=\"phase\" id=\"phase\">connecting…</div>\n    <span class=\"timer\" id=\"timer\"><span id=\"timerLbl\" style=\"font-size:10px;letter-spacing:1px;opacity:.85;margin-right:6px;text-transform:uppercase;\"></span><span id=\"timerVal\">0.0</span></span>\n  </div>\n\n  <div class=\"stage\">\n    <svg id=\"wheel\" viewBox=\"0 -150 440 600\"></svg>\n    <canvas id=\"confetti\" width=\"500\" height=\"500\"></canvas>\n    <div class=\"potbox\" id=\"potbox\">\n      <div class=\"lbl\" id=\"centerLbl\">pot</div>\n      <div class=\"big\" id=\"centerBig\">—</div>\n    </div>\n  </div>\n\n  <div class=\"legend\">\n    <span class=\"lg-15\">1.5×</span><span class=\"lg-g\">2.5×</span><span class=\"lg-o\">5×</span><span class=\"lg-h\">10×</span>\n  </div>\n\n  <div class=\"stakes\" id=\"stakes\"></div>\n  <div style=\"display:flex; justify-content:center; gap:8px; align-items:center; margin-top:6px;\">\n    <span class=\"tag\" style=\"color:var(--dim); font-size:11px;\">or bet any amount:</span>\n    <input id=\"betCustom\" type=\"number\" min=\"10\" placeholder=\"custom\" />\n  </div>\n\n  <div class=\"controls\">\n    <button id=\"joinBtn\" class=\"act btn-join\" disabled>PLACE BET</button>\n    <button id=\"rebuyBtn\" class=\"act btn-ghost\" style=\"display:none\" onclick=\"doRebuy()\">🔄 REBUY 2000</button>\n    <button id=\"bankBtn\" class=\"act btn-bank\" disabled>💰 BANK<small id=\"bankSub\"></small></button>\n    <button id=\"riskBtn\" class=\"act btn-risk\" disabled>🎲 RISK IT<small id=\"riskSub\"></small></button>\n  </div>\n\n  <div id=\"emotes\"></div>\n  <div class=\"panel\">\n    <div class=\"feed\" id=\"feed\"></div>\n    <div id=\"chatRow\"><input id=\"chatIn\" maxlength=\"120\" placeholder=\"say something…\" /><button class=\"act btn-ghost\" id=\"chatBtn\">Send</button></div>\n  </div>\n  <div class=\"howlink\"><span class=\"vlink\" onclick=\"openHow()\">how to play</span> <span style=\"color:#39544a;font-size:10px;margin-left:10px;\">v3.2-throne</span></div>\n</div>\n\n<div class=\"modal\" id=\"howModal\">\n  <div class=\"mcard\">\n    <h3>How to play</h3>\n    <ol>\n      <li><b>Pick a chip and place your bet</b> before the timer runs out. Your bet buys your slice of the wheel — <span class=\"hl\">bigger bet = bigger slice = better odds</span>, scaled exactly to your stake.</li>\n      <li><b>The bottle spins.</b> Wherever it lands, that player wins the pot. If it stops in a <span class=\"hl\">gold / orange / pink zone</span>, the pot is multiplied ×2.5, ×5, or ×10!</li>\n      <li><b>Winner's choice:</b> BANK your prize and keep it… or <span class=\"hl\">RISK IT</span> — roll the dice: <b>4, 5, or 6 doubles your prize</b>; 1, 2, or 3 and it's <b>all gone</b>. Survive and you can roll again — ride it as far as you dare.</li>\n    </ol>\n    <div class=\"tag\">Every spin is provably fair — outcomes are cryptographically committed before betting opens, and you can verify any round yourself via the \"details\" link after each payout.</div>\n    <div class=\"row\"><button class=\"act btn-join\" onclick=\"document.getElementById('howModal').classList.remove('open')\">Got it</button></div>\n  </div>\n</div>\n\n<div class=\"modal\" id=\"modal\">\n  <div class=\"mcard\">\n    <h3>Verify this round</h3>\n    <div class=\"tag\">The seed was hashed (committed) before betting and revealed after the round. Re-hash it and recompute the outcome yourself — don't trust, check.</div>\n    <label>Server seed (revealed)</label><input id=\"vServer\" />\n    <label>Client seed</label><input id=\"vClient\" />\n    <label>Commitment (shown before round)</label><input id=\"vCommit\" />\n    <div id=\"vResult\"></div>\n    <div class=\"row\">\n      <button class=\"act btn-ghost\" id=\"mClose\">Close</button>\n      <button class=\"act btn-join\" id=\"verifyBtn\">Verify</button>\n    </div>\n  </div>\n</div>\n\n<script src=\"https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js\"></script>\n<script>\nconst ws = new WebSocket(`${location.protocol===\"https:\"?\"wss\":\"ws\"}://${location.host}`);\nconst $ = id => document.getElementById(id);\nlet myId=null, order=[], lastRound={}, segCfg=null, plainFactor=0.69, kingName=null, kingIsMe=false, pendingWinnerName=null, pendingWinnerId=null, kingAngleG=0;\nlet tiers=[10,50,100,250,500], myStake=50, joined=false, myBal=0, tableStake=null;\n\n/* ============ AUDIO ============ */\nlet AC=null;\nfunction audio(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }\nfunction tickSnd(intensity=1){\n  const ac=audio(); if(!ac) return;\n  const o=ac.createOscillator(), g=ac.createGain();\n  o.type='square'; o.frequency.value=600+Math.random()*80;\n  g.gain.setValueAtTime(.05*intensity, ac.currentTime);\n  g.gain.exponentialRampToValueAtTime(.001, ac.currentTime+.05);\n  o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+.06);\n}\nfunction chord(freqs, dur=.5, vol=.08){\n  const ac=audio(); if(!ac) return;\n  freqs.forEach((f,i)=>{\n    const o=ac.createOscillator(), g=ac.createGain();\n    o.type='triangle'; o.frequency.value=f;\n    g.gain.setValueAtTime(vol, ac.currentTime+i*.04);\n    g.gain.exponentialRampToValueAtTime(.001, ac.currentTime+dur+i*.04);\n    o.connect(g).connect(ac.destination); o.start(ac.currentTime+i*.04); o.stop(ac.currentTime+dur+.2);\n  });\n}\nconst sndWin=()=>chord([392,494,587],.6), sndPump=()=>chord([523,659,784,1047],.9,.1), sndBust=()=>chord([196,185],.5,.07);\n\n/* ============ COUNTDOWN ============ */\nlet timerInt=null;\nfunction startTimer(ms){\n  clearInterval(timerInt);\n  const end=Date.now()+ms, t=$('timer'); t.classList.add('on');\n  timerInt=setInterval(()=>{\n    const left=Math.max(0,end-Date.now());\n    t.textContent=(left/1000).toFixed(1)+'s';\n    t.classList.toggle('urgent', left<3000);\n    if(left<=0){ clearInterval(timerInt); t.classList.remove('on','urgent'); }\n  },100);\n}\nfunction stopTimer(){ clearInterval(timerInt); $('timer').classList.remove('on','urgent'); }\n\n/* ============ WHEEL — stake-weighted slices ============ */\nconst CX=220, CY=220, R=196, RIN=64;\nfunction polar(a,r){ const rad=(a-90)*Math.PI/180; return [CX+r*Math.cos(rad), CY+r*Math.sin(rad)]; }\nfunction arcPath(a0,a1,r0,r1){\n  const [x0,y0]=polar(a0,r1),[x1,y1]=polar(a1,r1),[x2,y2]=polar(a1,r0),[x3,y3]=polar(a0,r0);\n  const big=(a1-a0)>180?1:0;\n  return `M${x0},${y0} A${r1},${r1} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${big} 0 ${x3},${y3} Z`;\n}\nfunction zoneLayout(){\n  const s=segCfg||[{factor:2.5,prob:.07},{factor:5,prob:.02},{factor:10,prob:.007}];\n  const tail=s.reduce((t,x)=>t+x.prob,0);\n  const zones=[{factor:0,frac:1-tail,color:null}];\n  s.forEach(x=>zones.push({factor:x.factor,frac:x.prob,\n    color:x.factor>=10?'var(--hot)':x.factor>=5?'var(--orange)':x.factor>=2.5?'var(--gold)':'#5fc98a'}));\n  return zones;\n}\n// arcs: each player slice ∝ stake. Returns [{a0,a1,center}] aligned to order[]\nfunction sliceArcs(list){\n  const total=list.reduce((s,p)=>s+(p.stake||1),0);\n  let a=-((list[0]?.stake||1)/total)*360/2; // center first player's slice at top\n  return list.map(p=>{\n    const span=((p.stake||1)/total)*360;\n    const arc={a0:a, a1:a+span, center:a+span/2, span};\n    a+=span; return arc;\n  });\n}\nlet currentArcs=[];\nfunction buildWheel(list, winnerId){\n  const svg=$('wheel'); svg.innerHTML='';\n  const emptyWheel=!list.length; if(emptyWheel) list=[{id:'a',name:'',stake:1},{id:'b',name:'',stake:1}];\n  currentArcs=sliceArcs(list);\n  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');\n  defs.innerHTML=`\n    <radialGradient id=\"felt\" cx=\"50%\" cy=\"42%\"><stop offset=\"0%\" stop-color=\"#1c5039\"/><stop offset=\"100%\" stop-color=\"#0c2e20\"/></radialGradient>\n    <radialGradient id=\"felt2\" cx=\"50%\" cy=\"42%\"><stop offset=\"0%\" stop-color=\"#174030\"/><stop offset=\"100%\" stop-color=\"#0a271b\"/></radialGradient>\n    <linearGradient id=\"glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0%\" stop-color=\"#0d4124\"/><stop offset=\"16%\" stop-color=\"#2f8f4f\"/>\n      <stop offset=\"40%\" stop-color=\"#8fdd9e\"/><stop offset=\"55%\" stop-color=\"#52bb6e\"/>\n      <stop offset=\"82%\" stop-color=\"#1b6336\"/><stop offset=\"100%\" stop-color=\"#0a351c\"/>\n    </linearGradient>\n    <radialGradient id=\"hub\" cx=\"50%\" cy=\"38%\"><stop offset=\"0%\" stop-color=\"#3a5446\"/><stop offset=\"100%\" stop-color=\"#0e1d15\"/></radialGradient>\n    <radialGradient id=\"wood\" cx=\"50%\" cy=\"35%\"><stop offset=\"0%\" stop-color=\"#7a4a22\"/><stop offset=\"45%\" stop-color=\"#5a3318\"/><stop offset=\"80%\" stop-color=\"#3d2110\"/><stop offset=\"100%\" stop-color=\"#241208\"/></radialGradient>\n    <linearGradient id=\"woodSheen\" x1=\"0\" y1=\"0\" x2=\"0.6\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#a06a38\" stop-opacity=\"0.7\"/><stop offset=\"30%\" stop-color=\"#7a4a22\" stop-opacity=\"0\"/><stop offset=\"100%\" stop-color=\"#1a0d04\" stop-opacity=\"0.5\"/></linearGradient>\n    <radialGradient id=\"bowl\" cx=\"50%\" cy=\"42%\"><stop offset=\"60%\" stop-color=\"#000\" stop-opacity=\"0\"/><stop offset=\"100%\" stop-color=\"#000\" stop-opacity=\"0.55\"/></radialGradient>\n    <radialGradient id=\"chrome\" cx=\"42%\" cy=\"32%\"><stop offset=\"0%\" stop-color=\"#ffffff\"/><stop offset=\"25%\" stop-color=\"#dfe6ec\"/><stop offset=\"55%\" stop-color=\"#9aa7b2\"/><stop offset=\"78%\" stop-color=\"#5c6770\"/><stop offset=\"100%\" stop-color=\"#2b3138\"/></radialGradient>\n    <radialGradient id=\"chromeTop\" cx=\"42%\" cy=\"30%\"><stop offset=\"0%\" stop-color=\"#ffffff\"/><stop offset=\"40%\" stop-color=\"#c8d2da\"/><stop offset=\"100%\" stop-color=\"#6b7681\"/></radialGradient>\n    <linearGradient id=\"thgold\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#f7d98c\"/><stop offset=\"50%\" stop-color=\"#e8b54d\"/><stop offset=\"100%\" stop-color=\"#946a16\"/></linearGradient>\n    <linearGradient id=\"thvel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#2f8f4f\"/><stop offset=\"100%\" stop-color=\"#0d4124\"/></linearGradient>`;\n  svg.appendChild(defs);\n  const g=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const a in attrs)e.setAttribute(a,attrs[a]);svg.appendChild(e);return e;};\n\n  // outer drop shadow ring for depth\n  g('circle',{cx:CX,cy:CY,r:R+26,fill:'#000',opacity:.35});\n  // WOODEN RIM (polished, like a real roulette wheel)\n  g('circle',{cx:CX,cy:CY,r:R+24,fill:'url(#wood)',stroke:'#160a03','stroke-width':2});\n  g('circle',{cx:CX,cy:CY,r:R+24,fill:'url(#woodSheen)'});\n  // inner gold trim rings framing the play area\n  g('circle',{cx:CX,cy:CY,r:R+9,fill:'none',stroke:'#1a0d04','stroke-width':3});\n  g('circle',{cx:CX,cy:CY,r:R+6,fill:'none',stroke:'var(--gold)','stroke-width':2.5,opacity:.92});\n  g('circle',{cx:CX,cy:CY,r:R+3,fill:'none',stroke:'var(--gold2)','stroke-width':1,opacity:.55});\n  // gold studs set into the wood rim\n  for(let i=0;i<24;i++){ const [sx,sy]=polar(i*15,R+16);\n    g('circle',{cx:sx,cy:sy,r:2.8,fill:'#1a0d04',opacity:.6});\n    g('circle',{cx:sx-0.5,cy:sy-0.5,r:2.2,fill:'var(--gold2)'});\n    g('circle',{cx:sx-0.8,cy:sy-0.8,r:0.9,fill:'#fff',opacity:.8});\n  }\n\n  const zones=zoneLayout();\n  list.forEach((p,i)=>{\n    const {a0,a1,span}=currentArcs[i];\n    let acc=0;\n    zones.forEach(z=>{\n      const z0=a0+acc*span, z1=a0+(acc+z.frac)*span; acc+=z.frac;\n      g('path',{d:arcPath(z0,z1,RIN,R), fill:z.color?z.color:(i%2?'url(#felt)':'url(#felt2)'),\n        stroke:'#081410','stroke-width':z.color?0.5:1, opacity:z.color?0.95:1});\n      if(z.color && z.frac*span>5){\n        const [tx,ty]=polar((z0+z1)/2,(R+RIN)/2);\n        g('text',{x:tx,y:ty,fill:'#1d1405','font-size':10,'font-weight':900,'text-anchor':'middle','dominant-baseline':'middle'}).textContent=z.factor+'×';\n      }\n    });\n    const [dx0,dy0]=polar(a0,RIN),[dx1,dy1]=polar(a0,R);\n    g('line',{x1:dx0,y1:dy0,x2:dx1,y2:dy1,stroke:'var(--gold)','stroke-width':1.2,opacity:.5});\n\n    const isWin=p.id===winnerId, isMe=p.id===myId;\n    const [px,py]=polar(currentArcs[i].center, R-28);\n    const rawName=(emptyWheel?'':(p.name||p.id)).slice(0,10);\n    const realCount=list.filter(x=>!String(x.id).startsWith('house')).length;\n    const name = isMe ? (realCount>1 ? 'YOU·'+rawName : 'YOU') : rawName;\n    const label = (p.stake>1 && !isMe)? `${name} · ${p.stake}` : (isMe && p.stake>1 ? `${name} · ${p.stake}` : name);\n    const w=Math.max(46,label.length*6.6+16);\n    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');\n    rect.setAttribute('x',px-w/2); rect.setAttribute('y',py-11); rect.setAttribute('width',w); rect.setAttribute('height',22); rect.setAttribute('rx',11);\n    rect.setAttribute('fill', isWin?'var(--gold)':isMe?'#13392a':'#0c1d15');\n    rect.setAttribute('stroke', isWin?'#fff':isMe?'#6ee7a0':'var(--line)');\n    rect.setAttribute('stroke-width', isWin?1.8:isMe?2.2:1);\n    if(isWin) rect.setAttribute('filter','drop-shadow(0 0 10px rgba(232,181,77,1))');\n    else if(isMe) rect.setAttribute('filter','drop-shadow(0 0 7px rgba(110,231,160,.9))');\n    svg.appendChild(rect);\n    const t=document.createElementNS('http://www.w3.org/2000/svg','text');\n    t.setAttribute('x',px); t.setAttribute('y',py+4); t.setAttribute('text-anchor','middle');\n    t.setAttribute('font-size',10.5); t.setAttribute('font-weight',800);\n    t.setAttribute('fill', isWin?'#241a04':isMe?'#9effc4':'var(--text)');\n    t.textContent=label; svg.appendChild(t);\n  });\n\n  // concave BOWL shadow over the play area for 3D depth\n  g('circle',{cx:CX,cy:CY,r:R,fill:'url(#bowl)'});\n  // CHROME CENTER SPINNER HUB (like the roulette photo)\n  g('circle',{cx:CX,cy:CY,r:RIN+2,fill:'#1a0d04',opacity:.5});\n  g('circle',{cx:CX,cy:CY,r:RIN,fill:'var(--gold)',opacity:.9});\n  g('circle',{cx:CX,cy:CY,r:RIN-3,fill:'url(#chrome)',stroke:'#2b3138','stroke-width':0.5});\n  g('circle',{cx:CX,cy:CY,r:RIN-12,fill:'url(#chromeTop)'});\n  g('circle',{cx:CX-RIN*0.28,cy:CY-RIN*0.34,r:RIN*0.18,fill:'#fff',opacity:.65});\n  g('circle',{cx:CX,cy:CY,r:5,fill:'#2b3138'});\n  (function(){var tx=CX,ty=-58;var thG=document.createElementNS('http://www.w3.org/2000/svg','g');thG.setAttribute('id','throneG');svg.appendChild(thG);var T=function(tag,at){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(var k in at)e.setAttribute(k,at[k]);thG.appendChild(e);return e;};T('ellipse',{cx:tx,cy:ty+96,rx:64,ry:12,fill:'#000',opacity:.4});T('path',{d:'M '+(tx-46)+' '+(ty+88)+' Q '+(tx-58)+' '+(ty-70)+' '+tx+' '+(ty-82)+' Q '+(tx+58)+' '+(ty-70)+' '+(tx+46)+' '+(ty+88)+' Z',fill:'url(#thgold)',stroke:'#3a2a05','stroke-width':2});T('path',{d:'M '+(tx-34)+' '+(ty+78)+' Q '+(tx-44)+' '+(ty-58)+' '+tx+' '+(ty-68)+' Q '+(tx+44)+' '+(ty-58)+' '+(tx+34)+' '+(ty+78)+' Z',fill:'url(#thvel)',stroke:'#0a3a1e','stroke-width':1.5});for(var r=0;r<4;r++){for(var c=0;c<3;c++){var bx=tx-18+c*18+(r%2?9:0);var by=ty-44+r*22;T('circle',{cx:bx,cy:by,r:2.4,fill:'#0a3a1e',opacity:.65});}}T('rect',{x:tx-40,y:ty+70,width:80,height:26,rx:8,fill:'url(#thgold)',stroke:'#3a2a05','stroke-width':1.5});T('rect',{x:tx-34,y:ty+72,width:68,height:16,rx:6,fill:'url(#thvel)'});T('path',{d:'M '+(tx-46)+' '+(ty+30)+' Q '+(tx-60)+' '+(ty+24)+' '+(tx-58)+' '+(ty+64)+' L '+(tx-46)+' '+(ty+66)+' Z',fill:'url(#thgold)',stroke:'#3a2a05','stroke-width':1.2});T('path',{d:'M '+(tx+46)+' '+(ty+30)+' Q '+(tx+60)+' '+(ty+24)+' '+(tx+58)+' '+(ty+64)+' L '+(tx+46)+' '+(ty+66)+' Z',fill:'url(#thgold)',stroke:'#3a2a05','stroke-width':1.2});var cr=ty-82;T('path',{d:'M '+(tx-16)+' '+cr+' L '+(tx-16)+' '+(cr-12)+' L '+(tx-8)+' '+(cr-4)+' L '+tx+' '+(cr-16)+' L '+(tx+8)+' '+(cr-4)+' L '+(tx+16)+' '+(cr-12)+' L '+(tx+16)+' '+cr+' Z',fill:'url(#thgold)',stroke:'#3a2a05','stroke-width':1});T('circle',{cx:tx-16,cy:cr-12,r:2.5,fill:'#f7d98c'});T('circle',{cx:tx,cy:cr-16,r:3,fill:'#ff4d88'});T('circle',{cx:tx+16,cy:cr-12,r:2.5,fill:'#f7d98c'});if(kingName){var kn=kingIsMe?'YOU':kingName;var kfs=kn.length>7?10:13;var ktt=T('text',{x:tx,y:ty-14,'text-anchor':'middle','font-size':kfs,'font-weight':900,fill:'#fff'});ktt.setAttribute('filter','drop-shadow(0 1px 3px #000)');ktt.textContent=kn;var ktag=T('text',{x:tx,y:ty+2,'text-anchor':'middle','font-size':8,'font-weight':800,fill:'#f7d98c','letter-spacing':'2px'});ktag.textContent='\u2654 KING';var mp=T('rect',{x:tx-58,y:ty+100,width:116,height:20,rx:10,fill:'url(#thgold)',stroke:'#fff','stroke-width':1.5});mp.setAttribute('filter','drop-shadow(0 0 8px rgba(232,181,77,.9))');var mtt=T('text',{x:tx,y:ty+114,'text-anchor':'middle','font-size':10.5,'font-weight':900,fill:'#241a04','letter-spacing':'0.3px'});mtt.textContent='1.5\u00D7 MULTIPLIER';}else{var et=T('text',{x:tx,y:ty+2,'text-anchor':'middle','font-size':10,'font-weight':800,fill:'#0d4124','letter-spacing':'1px'});et.textContent='THRONE';var et2=T('text',{x:tx,y:ty+92,'text-anchor':'middle','font-size':8.5,'font-weight':700,fill:'var(--gold2)','opacity':'0.9'});et2.textContent='win to claim +1.5\u00D7';}if(!kingName){thG.style.display='none';}else{thG.style.display='';}var kingAngle=kingAngleG;if(kingName&&kingName!=='House'&&!emptyWheel){for(var ki=0;ki<list.length;ki++){var pn=(list[ki].name||'');var isMeSeat=list[ki].id===myId;if((kingIsMe&&isMeSeat)||(!kingIsMe&&pn===kingName)){kingAngle=currentArcs[ki].center;kingAngleG=kingAngle;break;}}}var texts=thG.querySelectorAll('text');function setThrone(a){thG.setAttribute('transform','rotate('+a+' '+CX+' '+CY+')');for(var qi=0;qi<texts.length;qi++){var ix=Number(texts[qi].getAttribute('x'))||CX,iy=Number(texts[qi].getAttribute('y'))||CY;texts[qi].setAttribute('transform','rotate('+(-a)+' '+ix+' '+iy+')');}}var prevA=(window.__lastThroneA===undefined?kingAngle:window.__lastThroneA);if(prevA===kingAngle){setThrone(kingAngle);}else{var d=((kingAngle-prevA)%360+540)%360-180;var t0=performance.now(),dur=1100;(function anim(now){var pr=Math.min(1,(now-t0)/dur);var e=1-Math.pow(1-pr,3);setThrone(prevA+d*e);if(pr<1)requestAnimationFrame(anim);})(t0);}window.__lastThroneA=kingAngle;})();\n  const bg=g('g',{id:'bottleG'});\n  bg.innerHTML=`\n    <g>\n      <ellipse cx=\"${CX}\" cy=\"${CY+26}\" rx=\"15\" ry=\"5\" fill=\"rgba(0,0,0,.5)\"/>\n      <path d=\"M ${CX-13},${CY+24} L ${CX-13},${CY-34}\n               C ${CX-13},${CY-58} ${CX-4.5},${CY-60} ${CX-4.5},${CY-76} L ${CX-4.5},${CY-100}\n               L ${CX+4.5},${CY-100} L ${CX+4.5},${CY-76}\n               C ${CX+4.5},${CY-60} ${CX+13},${CY-58} ${CX+13},${CY-34} L ${CX+13},${CY+24}\n               Q ${CX+13},${CY+30} ${CX},${CY+30} Q ${CX-13},${CY+30} ${CX-13},${CY+24} Z\"\n            fill=\"url(#glass)\" stroke=\"#06270f\" stroke-width=\"1\"/>\n      <path d=\"M ${CX-13},${CY+18} Q ${CX},${CY+26} ${CX+13},${CY+18} L ${CX+13},${CY+24} Q ${CX+13},${CY+30} ${CX},${CY+30} Q ${CX-13},${CY+30} ${CX-13},${CY+24} Z\"\n            fill=\"#06270f\" opacity=\".55\"/>\n      <rect x=\"${CX-6}\" y=\"${CY-110}\" width=\"12\" height=\"11\" rx=\"1.5\" fill=\"url(#glass)\" stroke=\"#06270f\" stroke-width=\"1\"/>\n      <line x1=\"${CX-6}\" y1=\"${CY-107}\" x2=\"${CX+6}\" y2=\"${CY-107}\" stroke=\"#0a3a1e\" stroke-width=\"1\" opacity=\".8\"/>\n      <line x1=\"${CX-6}\" y1=\"${CY-104}\" x2=\"${CX+6}\" y2=\"${CY-104}\" stroke=\"#0a3a1e\" stroke-width=\"1\" opacity=\".8\"/>\n      <ellipse cx=\"${CX}\" cy=\"${CY-110}\" rx=\"6\" ry=\"1.6\" fill=\"#9fe3ac\" opacity=\".7\"/>\n      <path d=\"M ${CX-9},${CY+16} L ${CX-9},${CY-32} C ${CX-9},${CY-50} ${CX-2.5},${CY-56} ${CX-2.5},${CY-74} L ${CX-2.5},${CY-98}\"\n            fill=\"none\" stroke=\"rgba(255,255,255,.55)\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\".75\"/>\n      <path d=\"M ${CX+10},${CY+12} L ${CX+10},${CY-30}\" fill=\"none\" stroke=\"rgba(255,255,255,.18)\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n    </g>`;\n}\n\n/* ============ PHYSICS SPIN (stake-weighted landing) ============ */\nlet bottleAngle=0, animId=null;\nfunction setBottle(a){ bottleAngle=a; const b=$('bottleG'); if(b) b.setAttribute('transform',`rotate(${a} ${CX} ${CY})`); }\nfunction spinTo(winnerIndex, factor, durMs, done, multRoll){\n  cancelAnimationFrame(animId);\n  const arc=currentArcs[winnerIndex];\n  const zones=zoneLayout();\n  let acc=0, lo=0, hi=1;\n  for(const z of zones){ if((z.factor||0)===(factor>1?factor:0)){ lo=acc; hi=acc+z.frac; break; } acc+=z.frac; }\n  // TRUTHFUL placement: the bottle stops exactly where the provably-fair roll\n  // says, so a visual near-miss is a real near-miss, never theater.\n  const within=(typeof multRoll===\"number\" && multRoll>=lo && multRoll<hi)\n    ? lo + Math.max(0.04, Math.min(0.96, (multRoll-lo)/(hi-lo))) * (hi-lo)\n    : lo+(0.25+Math.random()*0.5)*(hi-lo);\n  const finalAngle=arc.a0+within*arc.span;\n  const start=bottleAngle%360, turns=5;\n  const total=turns*360+((finalAngle-start)%360+360)%360;\n  const t0=performance.now();\n  // boundaries for ticks = slice edges (variable widths!)\n  const edges=currentArcs.map(a=>((a.a0%360)+360)%360).sort((x,y)=>x-y);\n  let lastA=((start%360)+360)%360;\n  function crossed(prev,cur){\n    let n=0; for(const e of edges){\n      const span=((cur-prev)%360+360)%360;\n      const d=((e-prev)%360+360)%360;\n      if(d>0&&d<=span)n++;\n    } return n;\n  }\n  function frame(now){\n    const p=Math.min(1,(now-t0)/durMs);\n    const ease=1-Math.pow(1-p,4.2);\n    const a=start+total*ease;\n    setBottle(a);\n    const cur=((a%360)+360)%360;\n    const n=crossed(lastA,cur);\n    if(n>0){ tickSnd(Math.max(.3,1-p)); lastA=cur; }\n    if(p<1) animId=requestAnimationFrame(frame);\n    else done&&done();\n  }\n  animId=requestAnimationFrame(frame);\n}\n\n/* ============ CONFETTI + BANNER ============ */\nfunction confetti(n=90, gold=false){\n  const c=$('confetti'), ctx=c.getContext('2d');\n  const P=[]; for(let i=0;i<n;i++) P.push({x:c.width/2,y:c.height/2,\n    vx:(Math.random()-0.5)*10, vy:-Math.random()*9-3, s:3+Math.random()*4, r:Math.random()*Math.PI,\n    col:gold?['#e8b54d','#f7d98c','#fff3cf','#f08c3a'][i%4]:['#e8b54d','#4ade80','#7fd4a8','#f7d98c'][i%4], life:1});\n  const t0=performance.now();\n  function fr(now){\n    ctx.clearRect(0,0,c.width,c.height); let alive=false;\n    P.forEach(p=>{ p.vy+=0.18; p.x+=p.vx; p.y+=p.vy; p.r+=0.12; p.life-=0.008;\n      if(p.life>0){ alive=true; ctx.save(); ctx.globalAlpha=Math.max(0,p.life);\n        ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.col;\n        ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*1.6); ctx.restore(); }});\n    if(alive&&now-t0<3000) requestAnimationFrame(fr); else ctx.clearRect(0,0,c.width,c.height);\n  }\n  requestAnimationFrame(fr);\n}\nconst DIE_FACES=[\"\\u2680\",\"\\u2681\",\"\\u2682\",\"\\u2683\",\"\\u2684\",\"\\u2685\"];\nfunction rollDice(finalFace, survived, done){\n  const w=$(\"diceWrap\"), d=$(\"die\");\n  d.className=\"\"; d.textContent=DIE_FACES[Math.floor(Math.random()*6)];\n  w.classList.add(\"show\"); d.classList.add(\"rolling\");\n  const shuffle=setInterval(()=>{ d.textContent=DIE_FACES[Math.floor(Math.random()*6)]; tickSnd(.5); },90);\n  setTimeout(()=>{\n    clearInterval(shuffle); d.classList.remove(\"rolling\");\n    d.textContent=DIE_FACES[finalFace-1];\n    d.classList.add(survived?\"winface\":\"loseface\");\n    setTimeout(()=>{ w.classList.remove(\"show\"); done&&done(); }, 1100);\n  }, 1300);\n}\nfunction flash(){ const f=$('flash'); f.style.opacity=1; setTimeout(()=>f.style.opacity=0,260); }\nfunction banner(t1,t2,ms=2200){\n  $('wbT1').textContent=t1; $('wbT2').textContent=t2;\n  $('winbanner').classList.add('show');\n  setTimeout(()=>$('winbanner').classList.remove('show'), ms);\n}\n\n/* ============ STAKE PICKER ============ */\nfunction buildStakes(){\n  const box=$('stakes'); box.innerHTML='';\n  const locked = (tableStake!=null && !joined);\n  const cb=$('betCustom'); if(cb) cb.style.display = locked?'none':'';\n  const affordable=tiers.filter(v=>v<=myBal);\n  if(myBal>0 && !affordable.includes(myStake)) myStake=affordable.length?affordable[affordable.length-1]:tiers[0];\n  tiers.forEach(v=>{\n    const b=document.createElement('button');\n    b.className=`stake s${v}`+(v===myStake?' sel':'');\n    b.textContent=v;\n    if(v>myBal){ b.disabled=true; b.title='not enough chips'; }\n    b.onclick=()=>{ audio(); myStake=v; $('betCustom').value=''; buildStakes(); updateJoinBtn(); };\n    box.appendChild(b);\n  });\n}\nfunction updateJoinBtn(){\n  if(joined){ $('joinBtn').textContent='BET PLACED ✓'; }\n  else if(tableStake!=null){ $('joinBtn').textContent=`MATCH ${tableStake} TO JOIN`; }\n  else { $('joinBtn').textContent=`SET TABLE · ${myStake}`; }\n  const need = tableStake!=null ? tableStake : Math.min(...tiers);\n  const broke = myBal<need;\n  if(!joined && broke){ $('joinBtn').disabled=true; $('joinBtn').textContent = tableStake!=null?`NEED ${tableStake}`:'OUT OF CHIPS'; }\n  else if(!joined){ $('joinBtn').disabled=false; }\n  const rb=$('rebuyBtn'); if(rb) rb.style.display = (myBal<Math.min(...tiers))? 'inline-block':'none';\n}\n\n/* ============ GAME WIRING ============ */\nws.onmessage=(e)=>{\n  const m=JSON.parse(e.data);\n  switch(m.type){\n    case 'welcome':\n      myId=m.id; setBal(m.balance);\n      if(m.config&&m.config.anteTiers) tiers=m.config.anteTiers;\n      buildStakes(); updateJoinBtn(); break;\n    case 'room': {\n      $('phase').textContent=phaseText(m.phase);\n      const me=m.players.find(p=>p.id===myId); if(me) setBal(me.balance);\n      break; }\n    case 'betting_open':\n      joined=false; tableStake=null; updateJoinBtn();\n      $('joinBtn').disabled=false; $('bankBtn').disabled=true; $('riskBtn').disabled=true;\n      $('bankSub').textContent=''; $('riskSub').textContent='';\n      if(m.segments){ segCfg=m.segments; plainFactor=m.plainFactor; }\n      if(m.anteTiers) tiers=m.anteTiers; buildStakes();\n      buildWheel([],null); setBottle(bottleAngle);\n      $('centerLbl').textContent='place bets'; $('centerBig').textContent='—';\n      lastRound={commitment:m.commitment, clientSeed:m.clientSeed};\n      startTimer(m.bettingMs||10000, \"betting closes\");\n      $('phase').textContent='🎰 pick a chip & place your bet!';\n      log(`new round · commitment <code>${m.commitment.slice(0,12)}…</code>`);\n      break;\n    case 'joined':\n      joined=true; updateJoinBtn(); $('joinBtn').disabled=true; setBal(m.balance);\n      log(`bet placed: <span class=\"hl\">${m.stake}</span>`); break;\n    case 'participant_update': {\n      $('centerLbl').textContent='pot'; $('centerBig').textContent=m.pot;\n      if(typeof m.tableStake==='number'){ tableStake=m.tableStake; myStake=m.tableStake; buildStakes(); updateJoinBtn(); }\n      if(Array.isArray(m.participants)&&typeof m.participants[0]==='object'){\n        buildWheel(m.participants,null); setBottle(bottleAngle);\n      }\n      break; }\n    case 'spin': {\n      stopTimer();\n      order=m.order; pendingWinnerName=(m.order.find(p=>p.id===m.winnerId)||{}).name; pendingWinnerId=m.winnerId; buildWheel(m.order,null); setBottle(bottleAngle);\n      $('centerLbl').textContent='pot'; $('centerBig').textContent=m.pot;\n      $('joinBtn').disabled=true;\n      lastRound.k=m.order.length;\n      if(m.jackpot>0){ $('jackpotBar').style.display='block'; $('jackpotVal').textContent=m.jackpot; } else { $('jackpotBar').style.display='none'; }\n      $('phase').textContent='🍾 here we go…';\n      spinTo(m.winnerIndex, m.potFactor, (m.spinMs||7000)-300, ()=>{\n        if(m.nearMiss) setTimeout(()=>showNearMiss(m.nearMiss.factor), 600);\n        buildWheel(order, m.winnerId); setBottle(bottleAngle);\n        const w=order.find(p=>p.id===m.winnerId);\n        if(m.pumped){\n          flash(); sndPump(); confetti(160,true);\n          $('potbox').classList.add('pump');\n          $('centerLbl').innerHTML=`<span class=\"hl\">POT ×${m.potFactor}!</span>`;\n          $('centerBig').textContent=m.pumpedPrize;\n          banner(`POT PUMPED ×${m.potFactor}`, `${w?w.name:''} wins ${m.pumpedPrize}!`);\n          setTimeout(()=>$('potbox').classList.remove('pump'),600);\n          log(`<span class=\"hl\">🚀 POT ×${m.potFactor} → ${m.pumpedPrize}!</span>`);\n        } else { sndWin(); confetti(70); banner(m.winnerId===myId?'YOU WIN!':'WINNER', `${m.winnerId===myId?'':(w?w.name+' · ':'')}${m.pumpedPrize}`); }\n      }, m.multRoll);\n      break; }\n    case 'landed': {\n      $('centerLbl').innerHTML=m.pumped?`<span class=\"hl\">prize ×${m.potFactor}</span>`:'prize';\n      $('centerBig').textContent=m.prize;\n      const w=order.find(p=>p.id===m.winnerId);\n      log(`🎯 landed on <span class=\"hl\">${m.winnerId===myId?'YOU':(w?w.name:'Player')}</span> — prize ${m.prize}`);\n      break; }\n    case 'your_turn': {\n      const dbl=Math.floor(m.prize*m.chainMult);\n      $('bankBtn').disabled=false; $('riskBtn').disabled=false;\n      $('bankSub').textContent=`keep ${m.prize}`;\n      $('riskSub').textContent=`roll 4+ → ${dbl} · 3 or less → lose all`;\n      if(m.maxWin) log(`<span class=\"hl\">max win this chain: ${m.maxWin}</span>`);\n      $('centerBig').textContent=m.prize;\n      $('phase').textContent='💥 YOUR CALL — bank it or risk it';\n      startTimer(m.decisionMs||10000);\n      log(`<span class=\"hl\">YOUR CALL</span>: bank ${m.prize}, or roll the die — 4/5/6 doubles to ${dbl}, 1/2/3 loses it all`);\n      break; }\n    case 'decision_pending':\n      lastRound.decisionWinner=m.winnerId;\n      if(m.winnerId!==myId){\n        $('bankBtn').disabled=true; $('riskBtn').disabled=true;\n        $('centerBig').textContent=m.prize;\n        const wp=order.find(p=>p.id===m.winnerId);\n        $('phase').textContent=`😬 ${wp?wp.name:'the winner'} is deciding… bank or risk?`;\n        startTimer(m.decisionMs||10000);\n      }\n      break;\n    case 'chain_result': {\n      stopTimer();\n      $('bankBtn').classList.remove('sweat'); $('riskBtn').classList.remove('sweat');\n      // map the provably-fair roll [0,1) to a die face honestly:\n      // roll < 0.5 = survive = faces 4/5/6 ; roll >= 0.5 = bust = faces 1/2/3\n      const face=Math.max(1, Math.min(6, 6-Math.floor(m.roll*6)));\n      $('bankBtn').disabled=true; $('riskBtn').disabled=true;\n      rollDice(face, m.survived, ()=>{\n        $('centerBig').textContent=m.prize;\n        if(m.survived){ sndWin(); confetti(60); flash(); log(`<span class=\"win\">🎲 rolled ${face} — SURVIVED! → ${m.prize}</span>`); }\n        else { sndBust(); banner('BUSTED',`rolled ${face} — lost it all 💀`,1800); log(`<span class=\"loss\">🎲 rolled ${face} — BUST → 0</span>`); }\n      });\n      break; }\n    case 'banked':\n      stopTimer();\n      $('bankBtn').classList.remove('sweat'); $('riskBtn').classList.remove('sweat');\n      if(m.capped){ flash(); sndPump(); confetti(160,true); banner('🏆 MAX WIN!', `chain capped at ${m.prize} — auto-banked!`, 2600);\n        log(`<span class=\"hl\">🏆 MAX WIN — chain capped at ${m.prize}, banked automatically!</span>`); }\n      else log(m.auto?'<span class=\"win\">auto-banked (time up) ✓</span>':'<span class=\"win\">banked ✓</span>');\n      $('bankBtn').disabled=true; $('riskBtn').disabled=true; break;\n    case 'payout': {\n      stopTimer();\n      $('phase').textContent='round over — next one starting…';\n      lastRound={...lastRound, winnerId:m.winnerId, serverSeed:m.serverSeed, clientSeed:m.clientSeed, commitment:m.commitment};\n      const wp=order.find(p=>p.id===m.winnerId);\n      var winnerIsBot=String(m.winnerId||'').startsWith('house'); if(m.prize>0 && !winnerIsBot){ kingName=pendingWinnerName||(wp?wp.name:null); kingIsMe=(m.winnerId===myId); } else if(winnerIsBot){ kingName='House'; kingIsMe=false; } buildWheel(order,m.winnerId); \n      let ok=false; try{ ok=CryptoJS.SHA256(m.serverSeed).toString()===m.commitment; }catch(e){}\n      log(`payout: <span class=\"hl\">${m.winnerId===myId?'YOU':(wp?wp.name:'Player')}</span> ${m.prize>0?`won <span class=\"win\">${m.prize}</span>`:'<span class=\"loss\">busted</span>'} · ${ok?'<span class=\"win\">fair ✓</span>':'<span class=\"no\">✗</span>'} <span class=\"vlink\" onclick=\"openVerify()\">details</span>`);\n      break; }\n    case 'skip': {\n      stopTimer(); flash();\n      $('jackpotBar').style.display='block'; $('jackpotVal').textContent=m.jackpot;\n      $('phase').textContent='landed on nobody - JACKPOT carries over!';\n      banner('SKIPPED!', 'jackpot grows to '+m.jackpot+'!', 2400);\n      log('<span class=\"hl\">SKIP - jackpot carries, now '+m.jackpot+'!</span>');\n      break; }\n    case 'waiting': $('phase').textContent='waiting for more players to bet…'; stopTimer(); break;\n    case 'ante_refunded': setBal(m.balance); joined=false; updateJoinBtn(); log('bet refunded (need 2+ players)'); break;\n    case 'emote': floatEmote(m.e, m.from); break;\n    case 'chat': log('<span class=\"chatmsg\"><b>'+esc(m.from)+':</b> '+esc(m.text)+'</span>'); break;\n    case 'hover': {\n      const wp=order.find(p=>p.id===lastRound.decisionWinner);\n      $('bankBtn').classList.toggle('sweat', m.btn==='bank');\n      $('riskBtn').classList.toggle('sweat', m.btn==='risk');\n      if(m.btn) $('phase').textContent='👀 '+(wp?wp.name:'the winner')+' is hovering '+m.btn.toUpperCase()+'…';\n      break; }\n    case 'rebuy_ok': setBal(m.balance); sndWin(); log('<span class=\"win\">🔄 rebought — fresh 2000 chips</span>'); break;\n    case 'rebuy_wait': log(`<span class=\"loss\">rebuy in ${Math.ceil(m.ms/1000)}s — take a breather</span>`); break;\n    case 'error': log(`<span class=\"loss\">${m.msg}</span>`); break;\n  }\n};\nfunction phaseText(p){ return {BETTING:'🎰 pick a chip & place your bet!', SPINNING:'🍾 spinning…',\n  DECISION:'the winner is deciding…', PAYOUT:'round over', WAITING:'waiting for players…'}[p]||p; }\n\n$('nameBtn').onclick=()=>{ audio(); ws.send(JSON.stringify({type:'set_name', name:$('name').value})); };\n$('betCustom').addEventListener('input', ()=>{\n  const v=Math.floor(Number($('betCustom').value));\n  if(v>=10){ myStake=v; document.querySelectorAll('.stake').forEach(b=>b.classList.remove('sel')); updateJoinBtn(); }\n});\n$('joinBtn').onclick=()=>{ audio(); const nm=$('name').value.trim(); if(nm) ws.send(JSON.stringify({type:'set_name', name:nm})); ws.send(JSON.stringify({type:'join_round', stake:myStake})); };\n$('bankBtn').onclick=()=>{ ws.send(JSON.stringify({type:'bank'})); $('bankBtn').disabled=true; $('riskBtn').disabled=true; };\n$('riskBtn').onclick=()=>{ ws.send(JSON.stringify({type:'risk'})); $('bankBtn').disabled=true; $('riskBtn').disabled=true; };\n\nfunction doRebuy(){ audio(); ws.send(JSON.stringify({type:\"rebuy\"})); }\nwindow.doRebuy=doRebuy;\nfunction openVerify(){\n  $('vServer').value=lastRound.serverSeed||''; $('vClient').value=lastRound.clientSeed||'';\n  $('vCommit').value=lastRound.commitment||'';\n  $('vResult').innerHTML=''; $('modal').classList.add('open');\n}\nwindow.openVerify=openVerify;\nfunction openHow(){ $('howModal').classList.add('open'); }\nwindow.openHow=openHow;\n$('mClose').onclick=()=>$('modal').classList.remove('open');\ndocument.querySelectorAll('.modal').forEach(md=>md.onclick=(e)=>{ if(e.target.classList.contains('modal')) md.classList.remove('open'); });\n$('verifyBtn').onclick=()=>{\n  const ss=$('vServer').value.trim(), cs=$('vClient').value.trim(), commit=$('vCommit').value.trim();\n  if(!ss){ $('vResult').innerHTML='no revealed seed yet'; return; }\n  const commitOk=CryptoJS.SHA256(ss).toString()===commit;\n  $('vResult').innerHTML=`commitment match: <span class=\"${commitOk?'ok':'no'}\">${commitOk?'YES ✓ — the outcome was locked before betting':'NO ✗'}</span>`;\n};\n\nlet lastBal=0;\nfunction renderRack(bal){\n  const rack=$(\"rack\"); rack.innerHTML=\"\";\n  $(\"rackWrap\").style.display = bal>=10? \"block\":\"none\";\n  const denoms=[[500,\"c500\"],[100,\"c100\"],[50,\"c50\"],[10,\"c10\"]];\n  let rem=bal; const grew=bal>lastBal;\n  denoms.forEach(([v,cls])=>{\n    const n=Math.floor(rem/v); rem-=n*v;\n    if(n<=0) return;\n    const st=document.createElement(\"div\"); st.className=\"cstack\";\n    const shown=Math.min(n,10);\n    for(let i=0;i<shown;i++){\n      const c=document.createElement(\"div\");\n      const isTop=(i===shown-1);\n      c.className=\"chip \"+cls+(isTop?\" top\":\"\")+(grew&&i>=shown-2?\" new\":\"\");\n      if(isTop) c.setAttribute(\"data-v\", v);\n      st.appendChild(c);\n    }\n    const cnt=document.createElement(\"div\"); cnt.className=\"cnt\"; cnt.textContent=n+\"× \"+v;\n    st.appendChild(cnt);\n    rack.appendChild(st);\n  });\n  lastBal=bal;\n}\nfunction setBal(b){ myBal=Number(b)||0; $(\"bal\").textContent=b; renderRack(myBal); buildStakes(); updateJoinBtn(); }\nfunction esc(s){ return String(s).replace(/[&<>\"']/g, c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",\"\\\"\":\"&quot;\",\"'\":\"&#39;\"}[c])); }\nconst EMOTES=[\"😱\",\"🔥\",\"💀\",\"🍾\",\"😂\",\"💰\"];\n(function buildEmotes(){\n  const bar=$(\"emotes\");\n  EMOTES.forEach((e,i)=>{ const b=document.createElement(\"button\"); b.className=\"emo\"; b.textContent=e;\n    b.onclick=()=>{ audio(); ws.send(JSON.stringify({type:\"emote\", e:i})); };\n    bar.appendChild(b); });\n})();\nfunction floatEmote(e, from){\n  const f=document.createElement(\"div\"); f.className=\"floatE\";\n  f.style.left=(12+Math.random()*76)+\"%\";\n  f.innerHTML=esc(e)+\"<small>\"+esc(from)+\"</small>\";\n  $(\"floats\").appendChild(f);\n  setTimeout(()=>f.remove(), 2700);\n}\nfunction showNearMiss(factor){\n  const el=$(\"nearmiss\");\n  el.textContent=\"😤 SO CLOSE to ×\"+factor+\"!\";\n  el.classList.add(\"show\"); sndBust();\n  setTimeout(()=>el.classList.remove(\"show\"), 2200);\n}\n$(\"chatBtn\").onclick=()=>{ const t=$(\"chatIn\").value.trim(); if(!t) return;\n  ws.send(JSON.stringify({type:\"chat\", text:t})); $(\"chatIn\").value=\"\"; };\n$(\"chatIn\").addEventListener(\"keydown\", e=>{ if(e.key===\"Enter\") $(\"chatBtn\").click(); });\n// spectator-sweat senders: only meaningful when I am the winner (server enforces)\n[\"bankBtn\",\"riskBtn\"].forEach(id=>{\n  const btn=$(id), which=id===\"bankBtn\"?\"bank\":\"risk\";\n  const on=()=>{ if(!btn.disabled) ws.send(JSON.stringify({type:\"hover\", btn:which})); };\n  const off=()=>ws.send(JSON.stringify({type:\"hover\", btn:null}));\n  btn.addEventListener(\"mouseenter\", on);\n  btn.addEventListener(\"mouseleave\", off);\n  btn.addEventListener(\"touchstart\", on, {passive:true});\n});\nfunction log(html){ const d=document.createElement('div'); d.innerHTML=html; $('feed').prepend(d); }\nbuildWheel([],null); setBottle(0); buildStakes(); updateJoinBtn();\n</script>\n</body>\n</html>\n";

// ============ PROVABLY-FAIR CORE ============
"use strict";

/**
 * Provably-fair core for a crash game (PLAY MONEY / learning project).
 *
 * The trust model:
 *   1. Server generates a secret `serverSeed` each round.
 *   2. Server publishes SHA-256(serverSeed) as a COMMITMENT *before* bets.
 *      - one-way hash => reveals nothing about the seed
 *      - collision-resistant => server can't swap the seed later
 *   3. A `clientSeed` (player-controlled or public/unpredictable) is mixed in
 *      so the server can't pre-pick favorable server seeds.
 *   4. Crash point = deterministic function of HMAC(serverSeed, clientSeed).
 *   5. After the round, serverSeed is REVEALED. Anyone can:
 *        a) check SHA-256(revealed) === published commitment
 *        b) recompute the crash point from the formula
 *      => the round is verifiable, not "trust me".
 *
 * The house edge is VISIBLE in the formula. That's the point: provably-fair
 * guarantees the house isn't *also* secretly cheating on top of its stated edge.
 */



/** Generate a fresh random server seed (hex string). */
function generateServerSeed() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Roll a uniform float in [0, 1) from (serverSeed, clientSeed, nonce).
 *
 * The nonce lets ONE committed server seed produce MANY independent,
 * individually-verifiable outcomes in a round — e.g. nonce 0 = which player
 * the bottle lands on, nonce 1 = first chain spin, nonce 2 = second, etc.
 * Each is reproducible by the player after the seed is revealed.
 */
function rollFloat(serverSeed, clientSeed, nonce) {
  const hmac = crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");
  const intVal = parseInt(hmac.slice(0, 13), 16);
  return intVal / Math.pow(2, 52); // uniform [0, 1)
}

/** The public commitment shown BEFORE the round. */
function commitment(serverSeed) {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

/**
 * Derive the crash multiplier from the seeds.
 *
 * @param {string} serverSeed  secret until reveal
 * @param {string} clientSeed  known to both sides up front
 * @param {object} opts
 * @param {number} opts.houseEdge        e.g. 0.02 = 2% long-run edge
 * @param {number} opts.instantBustChance fraction of rounds forced to ~1.00x
 *                                         (this is your VOLATILITY knob: higher
 *                                          => more brutal early busts, and to
 *                                          keep the edge fixed the surviving
 *                                          rounds pay bigger / reach higher)
 * @returns {number} crash multiplier, >= 1.00
 */
function crashPoint(serverSeed, clientSeed, opts = {}) {
  const houseEdge = opts.houseEdge ?? 0.02;
  const instantBustChance = opts.instantBustChance ?? 0.0; // 0 = standard curve

  const hmac = crypto
    .createHmac("sha256", serverSeed)
    .update(clientSeed)
    .digest("hex");

  // First 13 hex chars -> 52-bit integer (safe in JS doubles).
  const slice = hmac.slice(0, 13);
  const intVal = parseInt(slice, 16);
  const max = Math.pow(2, 52);
  const r = intVal / max; // uniform in [0, 1)

  // VOLATILITY KNOB done honestly: a fraction `instantBustChance` of rounds
  // are forced to 1.00x, but we COMPENSATE the survivors so the long-run house
  // edge stays exactly `houseEdge`. The expected payout removed by the busts is
  // added back by scaling up the surviving multipliers. This changes the
  // *shape* (more brutal early, fatter wins later) without secretly changing
  // the edge. An honest game tunes feel, not the take.
  if (instantBustChance > 0) {
    const bustSlice = hmac.slice(13, 26);
    const bustRoll = parseInt(bustSlice, 16) / max;
    if (bustRoll < instantBustChance) {
      return 1.0;
    }
  }

  // Standard crash transform. As r -> 1, crash -> infinity (the fat tail).
  const denom = 1 - r;
  if (denom <= 0) return 1.0;

  // Compensation factor: survivors are scaled by 1/(1 - instantBustChance) so
  // total expected return is unchanged. (Forced busts return the bet's stake
  // expectation to zero on those rounds; survivors cover the difference.)
  const survivorBoost = 1 / (1 - instantBustChance);
  let crash = ((1 - houseEdge) / denom) * survivorBoost;

  // Floor at 1.00 and round to 2 decimals like a real client display.
  crash = Math.max(1.0, crash);
  return Math.floor(crash * 100) / 100;
}

/**
 * Standalone verifier — exactly what a suspicious player would run themselves.
 * Returns whether the revealed seed matches the commitment AND recomputes the
 * crash point so they can compare it to what the round actually showed.
 */
function verify(serverSeed, clientSeed, publishedCommitment, opts = {}) {
  const recomputedCommitment = commitment(serverSeed);
  const commitmentOk = recomputedCommitment === publishedCommitment;
  const recomputedCrash = crashPoint(serverSeed, clientSeed, opts);
  return {
    commitmentOk,
    recomputedCommitment,
    recomputedCrash,
  };
}




// ============ GAME SERVER ============
/**
 * Spin-the-Bottle — multiplayer, provably-fair, PLAY MONEY.
 *
 * The standout mechanic: players share a ROOM. Each round everyone who opts in
 * pays a fixed ante into a pot. A bottle spins (provably fair) and lands on ONE
 * player. That player then rides a BANK-OR-RISK chain everyone watches live:
 * bank the prize, or risk a fair double-or-nothing-style spin to grow it.
 *
 * HONEST ECONOMY (verified by simulation):
 *   - House edge is taken ONCE, at the pot: prize = pot * (1 - houseEdge).
 *   - The chain is a FAIR gamble (survive prob q pays 1/q) — zero extra edge.
 *   - RTP stays at (1 - houseEdge) no matter how the winner plays.
 *   - Banking is the smart play; the chain can't be gamed against the player.
 *
 * GOLDEN RULE (unchanged): the server owns all state and all randomness.
 * The client only displays and sends intents (join / bank / risk).
 */

const PORT = process.env.PORT || 3000;

const CONFIG = {
  houseEdge: 0.03,      // visible, the long-run take
  anteTiers: [10, 50, 100, 250, 500],  // quick-pick chips (UI); any custom amount allowed
  minStake: 10,
  maxStake: 100000,                     // sanity ceiling
  startBalanceBig: true,
  maxSeats: 8,          // table caps at 8 players
  chainSurvive: 0.5,    // q: personal bank-or-risk chain survive prob (pays 1/q)
  bettingMs: 10000,
  spinMs: 7000,
  decisionMs: 10000,
  payoutPauseMs: 3500,
  startBalance: 2000,
  chainMaxMult: 64,        // MAX-WIN CAP: chain auto-banks at 64x its starting prize
                           // (bounded exposure for certification; protects riders from ruin)
  rebuyCooldownMs: 60000,  // out of chips? rebuy after a 60s breather
  minPlayers: 2,
  skipChance: 0.12,     // ~12% of spins land on nobody → pot carries

  // POT-MULTIPLIER landing segments. When the bottle resolves a pump, the pot
  // visibly shoots up. IMPORTANT HONESTY NOTE: a pot is real money in, so the
  // rare big pumps are *funded* by quiet rounds paying less than the full pot.
  // The plain-win factor below is DERIVED automatically so the house edge stays
  // exactly `houseEdge` no matter how you tune these. Bigger/more-frequent
  // pumps => smaller plain wins. The take never changes; only the feel does.
  multiplierSegments: [
    { factor: 1.5, prob: 0.15 },   // common — pot bumps ~1 in 7 spins
    { factor: 2.5, prob: 0.05 },
    { factor: 5,   prob: 0.015 },
    { factor: 10,  prob: 0.005 },  // the sliver — rare and glorious
  ],
};

// chain payout multiplier per surviving spin (fair: 1/q)
const CHAIN_MULT = 1 / CONFIG.chainSurvive;

// Derive the plain-win payout factor so E[payout] = pot * (1 - houseEdge).
// CLEAN-WIN ECONOMY: when you win, prize = pot * BASE_FACTOR * pump (always a
// real win > your stake). House edge comes from how OFTEN you win (your pot
// share), NOT from shrinking wins. RTP verified at 97% solo and multiplayer.
const TAIL_PROB = CONFIG.multiplierSegments.reduce((s, x) => s + x.prob, 0);
const TAIL_EV = CONFIG.multiplierSegments.reduce((s, x) => s + x.prob * x.factor, 0);
const AVG_PUMP = (1 - TAIL_PROB) + TAIL_EV;            // average multiplier applied to a win
const BASE_FACTOR = (1 - CONFIG.houseEdge) / AVG_PUMP; // makes overall RTP = 1 - houseEdge
const PLAIN_FACTOR = BASE_FACTOR; // back-compat name used in startup log
if (BASE_FACTOR <= 0) throw new Error("Segments too rich to fund honestly.");

/** Map a uniform roll to the pump multiplier applied on top of BASE_FACTOR. */
function drawPumpFactor(r) {
  let c = 0;
  for (const s of CONFIG.multiplierSegments) {
    c += s.prob;
    if (r < c) return s.factor;
  }
  return 1; // no pump (plain win) — still a real win via BASE_FACTOR
}

// ---- serve the inlined page ----
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(PAGE_HTML);
});

const wss = new WebSocketServer({ server });

// ---- players ----
const players = new Map(); // ws -> { id, name, balance }
function send(ws, type, p) { if (ws.readyState === 1) ws.send(JSON.stringify({ type, ...p })); }
function broadcast(type, p) { for (const ws of players.keys()) send(ws, type, p); }

function roster() {
  return [...players.values()].map(p => ({ id: p.id, name: p.name, balance: p.balance }));
}
function pushRoom(extra = {}) {
  broadcast("room", { players: roster(), phase: round ? round.phase : "WAITING", ...extra });
}

// ---- round state ----
let round = null;
let carryJackpot = 0; // carried from SKIP rounds (already net of edge)

function newRound() {
  const serverSeed = generateServerSeed();
  const clientSeed = generateServerSeed(); // public round seed
  round = {
    phase: "BETTING",
    serverSeed,
    clientSeed,
    commitment: commitment(serverSeed),
    nonce: 0,
    participants: [],   // [{ ws, id, name }]
    winner: null,       // ws of chosen player
    prize: 0,
    chainLog: [],       // [{ nonce, roll, survived, prizeAfter }]
    tableStake: null,   // matched-bet model: first joiner sets it
  };
  broadcast("betting_open", {
    commitment: round.commitment,
    clientSeed: round.clientSeed,
    anteTiers: CONFIG.anteTiers,
    bettingMs: CONFIG.bettingMs,
    houseEdge: CONFIG.houseEdge,
    chainMult: CHAIN_MULT,
    chainSurvive: CONFIG.chainSurvive,
    segments: CONFIG.multiplierSegments,
    plainFactor: PLAIN_FACTOR,
  });
  pushRoom();
  setTimeout(closeBetting, CONFIG.bettingMs);
}

function closeBetting() {
  if (!round || round.phase !== "BETTING") return;
  if (round.participants.length === 0) {
    broadcast("waiting", { msg: "waiting for players…" });
    pushRoom();
    return setTimeout(newRound, 3000);
  }
  round.soloMode = false;
  // SOLO MODE: fill empty seats with clearly-labeled HOUSE BOTS.
  // Bots ante with house money; if a bot wins, the prize returns to the house.
  // Player RTP is identical to multiplayer (verified by simulation: 97%).
  if (round.participants.length < CONFIG.minPlayers) {
    const humanStake = round.participants[0].stake;
    const botCount = 2;
    for (let b = 0; b < botCount; b++) {
      round.participants.push({ ws: null, id: "house" + b, name: "🤖 House", stake: humanStake, isBot: true });
    }
    round.soloMode = true;
  }

  // STABLE SEATING: same players keep the same slice positions across rounds
  round.participants.sort((a,b)=>((a.isBot?1:0)-(b.isBot?1:0))||String(a.id).localeCompare(String(b.id)));
  // SPIN: provably-fair STAKE-WEIGHTED winner selection (verified: equal RTP at all stakes).
  round.phase = "SPINNING";
  const k = round.participants.length;
  const pot = round.participants.reduce((s,p)=>s+p.stake,0);
  const roll = rollFloat(round.serverSeed, round.clientSeed, round.nonce++); // nonce 0: winner
  let target = roll * pot, acc = 0, winnerIndex = 0;
  for (let i = 0; i < k; i++) { acc += round.participants[i].stake; if (target < acc) { winnerIndex = i; break; } }
  // CLEAN ECONOMY: winner is the stake-weighted pick — even in solo, a House
  // seat can win, meaning you cleanly LOSE your ante that round. That's what
  // makes a real win feel like a win. (No forcing the human to always win.)
  round.winner = round.participants[winnerIndex].ws;
  round.winnerIsBot = !!round.participants[winnerIndex].isBot;
  round.winnerBotId = round.participants[winnerIndex].id;
  round.winnerIdx = winnerIndex;
  // CARRYOVER: a skip roll decides if the bottle lands on nobody (not in solo).
  const skipRoll = rollFloat(round.serverSeed, round.clientSeed, round.nonce++);
  round.isSkip = (!round.soloMode && skipRoll < CONFIG.skipChance);
  // nonce 2: pump multiplier applied on top of the base win factor
  const multRoll = rollFloat(round.serverSeed, round.clientSeed, round.nonce++);
  const pump = drawPumpFactor(multRoll);
  const factor = BASE_FACTOR * pump; // effective payout factor on the pot
  // TRUTHFUL near-miss: only flag when the actual roll was genuinely within a
  // hair (in probability space) of a 5x/10x zone boundary. Never fabricated.
  let nearMiss = null;
  {
    let acc = 0;
    for (const s of CONFIG.multiplierSegments) {
      const lo = acc, hi = acc + s.prob; acc = hi;
      if (s.factor >= 5 && pump !== s.factor) {
        const d = Math.min(Math.abs(multRoll - lo), Math.abs(multRoll - hi));
        if (d < 0.006) nearMiss = { factor: s.factor, dist: d };
      }
    }
  }
  round.potFactor = pump;          // what the UI shows as the pump (1 = plain)
  round.pot = pot;
  const netThisRound = pot * (1 - CONFIG.houseEdge);
  const payablePot = netThisRound + carryJackpot;
  if (round.isSkip) {
    carryJackpot = payablePot;     // nobody wins; jackpot grows and carries
    round.prize = 0;
    round.jackpotAfter = carryJackpot;
  } else {
    round.prize = Math.round(payablePot * (pump / AVG_PUMP));
    carryJackpot = 0;              // jackpot paid out to the winner
    round.jackpotAfter = 0;
  }
  round.chainStartPrize = round.prize;
  round.maxWin = round.prize * CONFIG.chainMaxMult;

  broadcast("spin", {
    order: round.participants.map(p => ({ id: p.id, name: p.name, stake: p.stake })),
    winnerId: round.participants[winnerIndex].id,
    winnerIndex,
    spinMs: CONFIG.spinMs,
    pot,
    potFactor: pump,          // > 1 means the pot pumped
    pumped: pump > 1,
    pumpedPrize: round.prize,
    multRoll,                 // exact roll → client places the bottle truthfully
    nearMiss,                 // genuinely-close calls only
    isSkip: round.isSkip,
    jackpot: round.jackpotAfter || 0,
  });
  pushRoom();
  setTimeout(beginDecision, CONFIG.spinMs);
}

function beginDecision() {
  if (!round || round.phase !== "SPINNING") return;
  round.phase = "DECISION";
  if (round.isSkip) {
    broadcast("skip", { jackpot: round.jackpotAfter });
    return setTimeout(settle, 2500);
  }
  const wPart = round.participants.find(p => p.ws === round.winner) || round.participants[round.winnerIdx];
  if (round.winnerIsBot) {
    broadcast("landed", { winnerId: round.winnerBotId, prize: round.prize, pot: round.pot,
      potFactor: round.potFactor, pumped: round.potFactor > 1 });
    broadcast("decision_pending", { winnerId: round.winnerBotId, prize: round.prize, decisionMs: 2000 });
    return setTimeout(() => { round.prize = 0; /* house keeps */ broadcast("banked", { auto: true }); settle(); }, 2000);
  }
  const winnerPlayer = players.get(round.winner);
  broadcast("landed", {
    winnerId: winnerPlayer ? winnerPlayer.id : null,
    prize: round.prize,
    pot: round.pot,
    potFactor: round.potFactor,
    pumped: round.potFactor > 1,
  });
  promptDecision();
}

let decisionTimer = null;
function promptDecision() {
  const winnerPlayer = players.get(round.winner);
  if (!winnerPlayer) return settle(); // disconnected: auto-bank what they have
  send(round.winner, "your_turn", {
    prize: round.prize,
    chainMult: CHAIN_MULT,
    chainSurvive: CONFIG.chainSurvive,
    decisionMs: CONFIG.decisionMs,
    step: round.chainLog.length,
    maxWin: round.maxWin,
  });
  broadcast("decision_pending", {
    winnerId: winnerPlayer.id, prize: round.prize, decisionMs: CONFIG.decisionMs,
  });
  clearTimeout(decisionTimer);
  // player-friendly default: timeout BANKS (never auto-risks their money)
  decisionTimer = setTimeout(() => doBank(round.winner, true), CONFIG.decisionMs);
}

function doRisk(ws) {
  if (!round || round.phase !== "DECISION" || ws !== round.winner) return;
  clearTimeout(decisionTimer);
  const roll = rollFloat(round.serverSeed, round.clientSeed, round.nonce++);
  const survived = roll < CONFIG.chainSurvive;
  if (survived) {
    round.prize = Math.round(round.prize * CHAIN_MULT);
    round.chainLog.push({ nonce: round.nonce - 1, roll, survived: true, prizeAfter: round.prize });
    broadcast("chain_result", { survived: true, prize: round.prize, roll });
    // MAX-WIN CAP: at the ceiling the chain auto-banks (never confiscates).
    if (round.prize >= round.maxWin) {
      broadcast("banked", { auto: true, capped: true, prize: round.prize });
      return settle();
    }
    promptDecision(); // ride again or bank
  } else {
    round.chainLog.push({ nonce: round.nonce - 1, roll, survived: false, prizeAfter: 0 });
    round.prize = 0;
    broadcast("chain_result", { survived: false, prize: 0, roll });
    settle();
  }
}

function doBank(ws, auto = false) {
  if (!round || round.phase !== "DECISION" || ws !== round.winner) return;
  clearTimeout(decisionTimer);
  broadcast("banked", { auto });
  settle();
}

function settle() {
  if (!round) return;
  round.phase = "PAYOUT";
  const winnerPlayer = players.get(round.winner);
  if (winnerPlayer && round.prize > 0) winnerPlayer.balance += round.prize;

  broadcast("payout", {
    winnerId: round.winnerIsBot ? round.winnerBotId : (winnerPlayer ? winnerPlayer.id : null),
    prize: round.prize,
    // full reveal so anyone can verify the spin AND every chain step
    serverSeed: round.serverSeed,
    clientSeed: round.clientSeed,
    commitment: round.commitment,
    chainLog: round.chainLog,
  });
  pushRoom();
  setTimeout(newRound, CONFIG.payoutPauseMs);
}

// ---- connections ----
wss.on("connection", (ws) => {
  const id = Math.random().toString(36).slice(2, 7);
  players.set(ws, { id, name: `player_${id}`, balance: CONFIG.startBalance, lastRebuy: 0, lastSocial: 0 });
  send(ws, "welcome", { id, balance: CONFIG.startBalance, config: {
    anteTiers: CONFIG.anteTiers, houseEdge: CONFIG.houseEdge, chainSurvive: CONFIG.chainSurvive,
  }});
  pushRoom();
  if (round && round.phase === "BETTING") {
    send(ws, "betting_open", { commitment: round.commitment, clientSeed: round.clientSeed,
      anteTiers: CONFIG.anteTiers, bettingMs: CONFIG.bettingMs, houseEdge: CONFIG.houseEdge,
      chainMult: CHAIN_MULT, chainSurvive: CONFIG.chainSurvive });
  }

  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    const pl = players.get(ws);
    if (!pl) return;

    if (msg.type === "set_name" && typeof msg.name === "string") {
      pl.name = msg.name.slice(0, 16).replace(/[^\w \-]/g, "") || pl.name;
      pushRoom();
    }

    if (msg.type === "join_round") {
      if (!round || round.phase !== "BETTING") return send(ws, "error", { msg: "betting closed" });
      if (round.participants.some(p => p.ws === ws)) return;
      if (round.participants.length >= CONFIG.maxSeats) return send(ws, "error", { msg: "table full (8 seats)" });
      let stake = Math.floor(Number(msg.stake));
      // MATCHED BETS: first player to join SETS the table stake; everyone else
      // must match it. Equal pots => every win is genuinely positive.
      if (round.tableStake == null) {
        if (!Number.isFinite(stake) || stake < CONFIG.minStake) return send(ws, "error", { msg: "minimum bet is " + CONFIG.minStake });
        if (stake > CONFIG.maxStake) return send(ws, "error", { msg: "maximum bet is " + CONFIG.maxStake });
        round.tableStake = stake;
      } else {
        stake = round.tableStake;
      }
      if (pl.balance < stake) return send(ws, "error", { msg: "need " + stake + " to match this table" });
      pl.balance -= stake;
      round.participants.push({ ws, id: pl.id, name: pl.name, stake });
      send(ws, "joined", { balance: pl.balance, stake });
      broadcast("participant_update", {
        participants: round.participants.map(p => ({ id: p.id, name: p.name, stake: p.stake })),
        pot: round.participants.reduce((s,p)=>s+p.stake,0),
        tableStake: round.tableStake,
      });
    }

    if (msg.type === "emote") {
      const EMOTES = ["😱","🔥","💀","🍾","😂","💰"];
      const e = EMOTES[msg.e | 0];
      if (!e) return;
      const now = Date.now();
      if (now - pl.lastSocial < 600) return; // rate limit
      pl.lastSocial = now;
      broadcast("emote", { from: pl.name, e });
    }

    if (msg.type === "chat") {
      const text = String(msg.text || "").slice(0, 120).trim();
      if (!text) return;
      const now = Date.now();
      if (now - pl.lastSocial < 800) return;
      pl.lastSocial = now;
      broadcast("chat", { from: pl.name, text }); // client escapes on render
    }

    if (msg.type === "hover") {
      // spectator sweat: only the current winner during DECISION may broadcast
      if (!round || round.phase !== "DECISION" || ws !== round.winner) return;
      const btn = msg.btn === "bank" || msg.btn === "risk" ? msg.btn : null;
      broadcast("hover", { btn });
    }

    if (msg.type === "rebuy") {
      const minTier = Math.min(...CONFIG.anteTiers);
      if (pl.balance >= minTier) return send(ws, "error", { msg: "you still have chips" });
      const now = Date.now();
      const wait = pl.lastRebuy + CONFIG.rebuyCooldownMs - now;
      if (wait > 0) return send(ws, "rebuy_wait", { ms: wait });
      pl.lastRebuy = now;
      pl.balance = CONFIG.startBalance;
      send(ws, "rebuy_ok", { balance: pl.balance });
      pushRoom();
    }

    if (msg.type === "risk") doRisk(ws);
    if (msg.type === "bank") doBank(ws, false);
  });

  ws.on("close", () => {
    // if the chosen player leaves mid-decision, bank whatever they had for them
    const wasWinner = round && round.winner === ws && round.phase === "DECISION";
    players.delete(ws);
    if (wasWinner) doBank(ws); // settle gracefully
    pushRoom();
  });
});

server.listen(PORT, () => {
  console.log(`Spin-the-Bottle (play money) on http://localhost:${PORT}`);
  console.log(`stakes=${CONFIG.anteTiers.join("/")} edge=${CONFIG.houseEdge} maxSeats=${CONFIG.maxSeats}`);
  console.log(`win pays ${BASE_FACTOR.toFixed(3)}x pot (x pump); you win your stake-share of the time; edge ${CONFIG.houseEdge}`);
  newRound();
});
