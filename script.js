// --- データ定義 ---
const characters = {
    power: { name: "ルナリア", img: "images/lunaria.png", faces: ["40ダメ", "30ダメ", "ミス", "30ダメ", "20ダメ", "ミス"] },
    heal: { name: "マリー", img: "images/marie.png", faces: ["15ダメ", "30回復", "15ダメ", "20回復", "10ダメ", "ミス"] },
    balance: { name: "ユキ", img: "images/yuki.png", faces: ["15ダメ", "20ダメ", "15ダメ", "20回復", "15ダメ", "20ダメ"] }
};

const enemies = [
    { name: "ちびデビル", hp: 50, maxHp: 50, img: "images/enemy1.png", faces: ["10ダメ", "ミス", "15ダメ", "ミス", "20ダメ", "ミス"] },
    { name: "アビス・ドラゴン", hp: 100, maxHp: 100, img: "images/enemy2.png", faces: ["10ダメ", "20ダメ", "ミス", "30ダメ＋軽減", "15ダメ", "ミス"] },
    { name: "復讐の姫エルヴィラ", hp: 150, maxHp: 150, img: "images/enemy3.png", faces: ["10ダメ", "サクリファイス", "ミス", "50ダメ", "20ダメ＋軽減", "自傷"] }
];

const specialNames = { power: "スターライト・レクイエム", heal: "イモータル・キッス", balance: "アーク・プロトコル" };
const cutInColors = { power: "rgba(192,192,192,0.9)", heal: "rgba(255,182,193,0.9)", balance: "rgba(144,238,144,0.9)" };

// --- 音声 ---
const seRoll = new Audio('images/roll.mp3');
const seHit = new Audio('images/se.mp3');
const seHeal = new Audio('images/heal.mp3');
const seFinish = new Audio('images/shakin.mp3');
const seLose = new Audio('images/lose.mp3');
const seSpecialReady = new Audio('images/special_ready.mp3');
const seSpecialCutin = new Audio('images/special_cutin.mp3');
const seSpecialHit = new Audio('images/special_hit.mp3');
const allSounds = [seRoll, seHit, seHeal, seFinish, seLose, seSpecialReady, seSpecialCutin, seSpecialHit];

function unlockAudio() {
    // 既存の音声アンロック
    allSounds.forEach(s => {
        s.play().then(() => { s.pause();
            s.currentTime = 0; }).catch(e => console.log(e));
    });
    
    // ★追加：画像プリロード処理
    const imageUrls = [
        ...Object.values(characters).map(c => c.img),
        ...enemies.map(e => e.img),
        'images/title_bg.png' // タイトル背景など
    ];
    
    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

// --- グローバル変数 ---
let playerHP = 100, enemyHP = 100, playerType = "", isRolling = false, isPlayerTurn = true;
let isSpecialPencil = false, isNextSpecial = false, nextReduction = 0, enemyReduction = 0, turnCount = 0, currentEnemyIndex = 0;
let battleLogs = []; // ★ログ履歴用

// --- 画面遷移 ---
function showSelect() {
    unlockAudio();
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('select-screen').style.display = 'block';
}

function showRules() {
    alert(`【まゐの鉛筆バトル！ 遊び方】\n\n● 三連戦サバイバルバトル！鉛筆を振り技を繰り出せ！\n● 受けたダメージは引き継がれるが、撃破時にボーナスとしてHPが30回復する\n● 3ターン目から20%の確率で「必殺技鉛筆」に変化\n● ガード（軽減）は、ダメージを受けるまで持続する`);
}

function startGame(type) {
    playerType = type; playerHP = 100; currentEnemyIndex = 0;
    document.getElementById('player-name-label').innerText = characters[type].name;
    document.getElementById('player-img').src = characters[type].img;
    document.getElementById('select-screen').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'block';
    setupEnemy();
}

function setupEnemy() {
    const enemy = enemies[currentEnemyIndex];
    enemyHP = enemy.hp; turnCount = 0; nextReduction = 0; enemyReduction = 0; isNextSpecial = false; battleLogs = [];
    document.getElementById('pencil').innerText = "？";
    document.getElementById('pencil').classList.remove('pencil-special');
    document.getElementById('enemy-name-label').innerText = enemy.name;
    document.getElementById('enemy-img').src = enemy.img;
    document.getElementById('enemy-img').style.opacity = "1";
    document.getElementById('player-sprite').classList.remove('win-jump');
    document.getElementById('retry-area').style.display = "none";
    document.getElementById('roll-button').style.display = "inline-block";
    document.getElementById('log-history').innerHTML = "";
    updateUI();
    addLog("バトル開始！");
    preparePlayerTurn();
}

// --- ログ管理システム ---
function addLog(newMsg) {
    const logText = document.getElementById('log-text');
    const logHistory = document.getElementById('log-history');
    const currentMsg = logText.innerHTML;
    const noiseWords = ["あなたの番", "の番です", "チャンス到来", "バトル開始", "撃破", "あきらめる"];
    const isNoise = noiseWords.some(word => currentMsg.includes(word)) || currentMsg === "";
    if (!isNoise) {
        battleLogs.unshift(currentMsg);
        if (battleLogs.length > 3) battleLogs.pop();
    }
    logText.innerHTML = newMsg;
    logHistory.innerHTML = battleLogs.map(l => `<div class="history-item">・${l}</div>`).join('');
}

// --- バトルロジック ---
function preparePlayerTurn() {
    const pencil = document.getElementById('pencil');
    const btn = document.getElementById('roll-button');
    turnCount++; isPlayerTurn = true; btn.disabled = false;
    pencil.innerText = "？"; 
    if (isNextSpecial) {
        isSpecialPencil = true; pencil.classList.add('pencil-special');
        addLog("<b style='color:orange'>✨ 必殺チャンス到来！ ✨</b>");
        seSpecialReady.play(); isNextSpecial = false;
    } else {
        isSpecialPencil = false; pencil.classList.remove('pencil-special');
        addLog("あなたの番！");
    }
}

function rollPencil() { if (!isRolling && isPlayerTurn) processTurn("player"); }

function processTurn(whosTurn) {
    isRolling = true;
    const pencil = document.getElementById('pencil');
    const btn = document.getElementById('roll-button');
    if (whosTurn === "enemy") addLog(`${enemies[currentEnemyIndex].name}の番です！`);
    let waitTime = whosTurn === "enemy" ? 800 : 0;
    setTimeout(() => {
        seRoll.currentTime = 0; seRoll.play();
        pencil.classList.add('rolling'); 
        if (whosTurn === "player" && isSpecialPencil) pencil.innerText = "🔥奥義🔥";
        btn.disabled = true;
        setTimeout(() => {
            pencil.classList.remove('rolling');
            let result;
            if (whosTurn === "player" && isSpecialPencil) {
                result = (Math.random() < 0.66) ? "必殺技" : "ミス";
            } else {
                const data = (whosTurn === "player") ? characters[playerType] : enemies[currentEnemyIndex];
                result = data.faces[Math.floor(Math.random() * 6)];
            }
            pencil.innerText = (result === "必殺技") ? "🔥奥義🔥" : result;
            applyResult(result, whosTurn);
            if (whosTurn === "player") {
                isSpecialPencil = false; pencil.classList.remove('pencil-special');
                if (enemyHP > 0 && turnCount + 1 >= 3 && Math.random() < 0.2) isNextSpecial = true;
            }
            // ★待ち時間を特殊技に関わらず一律1600msに修正
            let delay = 1600; 
            setTimeout(() => {
                if (playerHP > 0 && enemyHP > 0) {
                    if (whosTurn === "player") processTurn("enemy");
                    else preparePlayerTurn();
                } else announceWinner();
                isRolling = false;
            }, delay);
        }, 1000);
    }, waitTime);
}

function applyResult(result, whosTurn) {
    const currentEnemy = enemies[currentEnemyIndex];
    const playerName = characters[playerType].name;
    
    if (whosTurn === "player") {
        if (result === "必殺技") {
            showCutIn();
            setTimeout(() => { seSpecialHit.play(); }, 500);
            let dmg = 0, eff = "";
            if (playerType === 'power') { dmg = 60; nextReduction = 20; eff = "防御(20)！"; }
            else if (playerType === 'heal') { dmg = 30; playerHP = Math.min(100, playerHP + 50); eff = "50回復！"; showEffect("player", "+50", "#0f0", "heal"); }
            else if (playerType === 'balance') { dmg = 30; playerHP = Math.min(100, playerHP + 30); nextReduction = 20; eff = "30回復＋防御(20)！"; showEffect("player", "+30", "#0f0", "heal"); }
            
            let finalMsg = `<b>${specialNames[playerType]}！</b><br>`;
            if (enemyReduction > 0) { dmg = Math.max(0, dmg - enemyReduction); finalMsg += `軽減されたが${dmg}ダメ＋${eff}`; enemyReduction = 0; }
            else { finalMsg += `${dmg}ダメ＋${eff}`; }
            enemyHP -= dmg; showEffect("enemy", `-${dmg}`, "orange");
            addLog(finalMsg);
        } else if (result.includes("ダメ")) {
            let val = parseInt(result);
            if (enemyReduction > 0) { val = Math.max(0, val - enemyReduction); enemyReduction = 0; addLog(`敵の防御！${val}ダメに軽減！`); }
            else { addLog(`${playerName}の攻撃！${val}ダメ！`); }
            enemyHP -= val; showEffect("enemy", `-${val}`, "red"); seHit.play();
        } else if (result.includes("回復")) {
            let val = parseInt(result); playerHP = Math.min(100, playerHP + val);
            addLog(`${playerName}の回復！${val}回復！`);
            showEffect("player", `+${val}`, "#0f0", "heal"); seHeal.play();
        } else addLog(`${playerName}はミスした！`);
    } else {
        // --- 敵のターン ---
        if (result === "30ダメ＋軽減") {
            let val = Math.max(0, 30 - nextReduction); playerHP -= val; enemyReduction = 10; nextReduction = 0;
            addLog(`${currentEnemy.name}の攻撃！${val}ダメ＋防御(10)！`);
            showEffect("player", `-${val}`, "red"); seHit.play();
        } else if (result === "サクリファイス") {
            let val = Math.max(0, 20 - nextReduction); playerHP -= val; enemyHP = Math.min(currentEnemy.maxHp, enemyHP + 20); nextReduction = 0;
            addLog("<b>ホーリー・サクリファイス！</b><br>20ダメ与え敵20回復！");
            showEffect("player", `-${val}`, "red"); showEffect("enemy", "+20", "#fff", "heal"); seHeal.play();
        } else if (result === "20ダメ＋軽減") {
            let val = Math.max(0, 20 - nextReduction); playerHP -= val; enemyReduction = 20; nextReduction = 0;
            addLog(`${currentEnemy.name}の攻撃！${val}ダメ＋防御(20)！`);
            showEffect("player", `-${val}`, "red"); seHit.play();
        } else if (result === "自傷") {
            enemyHP -= 20; // ★自傷のログ内容を変更
            addLog(`${currentEnemy.name}の魔力が暴走！自傷20ダメ！`);
            showEffect("enemy", "-20", "purple"); seHit.play();
        } else if (result.includes("ダメ")) {
            let val = parseInt(result);
            if (nextReduction > 0) { val = Math.max(0, val - nextReduction); nextReduction = 0; addLog(`防御成功！${val}ダメに軽減！`); }
            else { addLog(`${currentEnemy.name}の攻撃！${val}ダメ受けた！`); }
            playerHP -= val; showEffect("player", `-${val}`, "red"); seHit.play();
        } else if (result.includes("回復")) {
            let val = parseInt(result); enemyHP = Math.min(currentEnemy.maxHp, enemyHP + val);
            addLog(`${currentEnemy.name}の回復！${val}回復！`);
            showEffect("enemy", `+${val}`, "#0f0", "heal"); seHeal.play();
        } else addLog(`${currentEnemy.name}はミスした！`);
    }
    updateUI();
}

function updateUI() {
    playerHP = Math.min(100, Math.max(0, playerHP));
    const currentEnemy = enemies[currentEnemyIndex];
    enemyHP = Math.min(currentEnemy.maxHp, Math.max(0, enemyHP));
    const pBar = document.getElementById('player-hp-bar');
    const eBar = document.getElementById('enemy-hp-bar');
    pBar.style.width = playerHP + "%";
    eBar.style.width = (enemyHP / currentEnemy.maxHp * 100) + "%";

    // 瀕死（25%以下）で色を赤く変える
    pBar.style.background = playerHP <= 25 ? "#f44336" : "#4caf50";
    eBar.style.background = (enemyHP / currentEnemy.maxHp) <= 0.25 ? "#f44336" : "#4caf50";
}

function announceWinner() {
    const btn = document.getElementById('roll-button');
    const retryArea = document.getElementById('retry-area');
    btn.style.display = "none";
    retryArea.style.display = "block";
    if (enemyHP <= 0) {
        if (currentEnemyIndex < enemies.length - 1) {
            playerHP = Math.min(100, playerHP + 30); updateUI();
            addLog(`🎉 ${enemies[currentEnemyIndex].name}を撃破！<br>勝利ボーナスHP30回復！`);
            retryArea.innerHTML = `<button class="next-btn" onclick="nextBattle()">次のバトルへ進む！</button><br><button class="quit-btn" onclick="confirmQuit()">あきらめる</button>`;
        } else {
            seFinish.play(); addLog("🎉 全クリア！伝説の勇者誕生！ 🎉");
            document.getElementById('player-sprite').classList.add('win-jump'); createParticles();
            retryArea.innerHTML = `<button class="next-btn" onclick="location.reload()">タイトルへ戻る</button>`;
        }
    } else {
        seLose.play(); addLog("💀 敗北... まゐの冒険は終わった。");
        document.getElementById('player-img').style.opacity = "0.4";
        retryArea.innerHTML = `<button class="next-btn" onclick="location.reload()">タイトルへ戻る</button>`;
    }
}

function confirmQuit() { if (confirm("本当にタイトルに戻る？")) location.reload(); }
function nextBattle() { currentEnemyIndex++; setupEnemy(); }

function showCutIn() {
    const layer = document.getElementById('cutin-layer');
    document.querySelector('.cutin-bg').style.setProperty('--cutin-color', cutInColors[playerType]);
    document.getElementById('cutin-img').src = characters[playerType].img;
    document.getElementById('cutin-name').innerText = specialNames[playerType];
    seSpecialCutin.play(); layer.style.display = 'flex';
    setTimeout(() => { layer.style.display = 'none'; }, 2500);
}

function showEffect(target, text, color, type="damage") {
    const pop = document.getElementById(target + '-popup');
    const img = document.getElementById(target + '-img');
    pop.innerText = text; pop.style.color = color; pop.classList.add('popup-anim');
    if(type === "damage") img.classList.add('damage-shake', 'damage-flash');
    setTimeout(() => { pop.classList.remove('popup-anim'); img.classList.remove('damage-shake', 'damage-flash'); }, 800);
}

function createParticles() {
    const arena = document.querySelector('.arena');
    const emojis = ['⭐', '💖', '✨', '🎉'];
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle'; p.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.setProperty('--dx', (Math.random() - 0.5) * 300 + "px");
        p.style.setProperty('--dy', (Math.random() - 0.5) * 300 - 50 + "px");
        p.style.left = "70%"; p.style.bottom = "20%"; arena.appendChild(p);
        setTimeout(() => p.remove(), 1200);
    }
}
