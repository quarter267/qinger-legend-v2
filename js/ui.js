// ==================== UI 系统 ====================
const UISystem = (() => {
  let playerState;
  let dialogOpen = false;
  let forgeOpen = false;
  let questOpen = false;
  let dialogQueue = [];
  let dialogCallback = null;
  let materialInventory = {};
  let toastTimer = null;

  const QUESTS = [
    { id: 'main_01', title: '主线：初入青耳', type: 'main', done: false, desc: '与村长石砚交谈，了解青耳世界的危机。', progress: () => '目标：与村长交谈' },
    { id: 'elder_talked', title: '主线：村长的嘱托', type: 'main', done: false, desc: '村长提醒你习武求生，去找铁匠阿锤打造武器。', progress: () => '目标：前往铁匠铺' },
    { id: 'weapon_upgrade', title: '支线：打造神兵', type: 'side', done: false, desc: '收集铁矿和狼牙，在铁匠铺升级你的武器。', progress: () => `进度：武器Lv.${PlayerController.getState().weaponLevel} / 目标Lv.3` },
    { id: 'forest_explored', title: '支线：幽暗古林', type: 'side', done: false, desc: '探索西面的幽暗古林，寻找青耳的秘密。', progress: () => '目标：深入幽暗古林' },
    { id: 'defeat_golem', title: '支线：熔岩守卫', type: 'side', done: false, desc: '击败熔岩裂谷的岩石巨人，获得炽热之核。', progress: () => '目标：击杀熔岩石巨人' },
  ];

  function init() {
    renderMaterials();
    renderQuests();
  }

  function updateHUD(state) {
    playerState = state;
    const healthFill = document.querySelector('.health-fill');
    const healthText = document.querySelector('.health-text');
    const staminaFill = document.querySelector('.stamina-fill');
    const staminaText = document.querySelector('.stamina-text');
    if (healthFill && healthText) {
      const hpPct = (state.health / state.maxHealth) * 100;
      healthFill.style.width = hpPct + '%';
      healthText.textContent = `${Math.ceil(state.health)} / ${state.maxHealth}`;
      if (hpPct < 30) {
        healthFill.style.background = 'linear-gradient(90deg, #880000, #cc2222)';
      }
    }
    if (staminaFill && staminaText) {
      const stPct = (state.stamina / state.maxStamina) * 100;
      staminaFill.style.width = stPct + '%';
      staminaText.textContent = `${Math.ceil(state.stamina)} / ${state.maxStamina}`;
    }
    const sneakInd = document.getElementById('sneak-indicator');
    if (sneakInd) {
      sneakInd.style.display = state.sneak ? 'block' : 'none';
    }
    updateSkillBars();
  }

  function updateSkillBars() {
    const strongBar = document.getElementById('strong-bar');
    if (strongBar) strongBar.style.width = '100%';
    const rollBar = document.getElementById('roll-bar');
    if (rollBar) rollBar.style.width = '100%';
  }

  function update(dt) {}

  function updateStoneCount(count) {
    document.getElementById('stone-count').textContent = count;
  }

  function addMaterial(type, count) {
    if (!materialInventory[type]) materialInventory[type] = 0;
    materialInventory[type] += count;
    renderMaterials();
  }

  function getMaterials() { return materialInventory; }

  function renderMaterials() {
    const container = document.getElementById('materials');
    if (!container) return;
    container.innerHTML = '';
    const names = { herb: '草药', iron: '铁矿', fruit: '果实', wolf_fang: '狼牙', slime_gel: '史莱姆凝胶', lava_core: '炽热之核', ice_crystal: '寒冰晶' };
    const colors = { herb: '#66cc66', iron: '#9999aa', fruit: '#ff6633', wolf_fang: '#eeeecc', slime_gel: '#66dd66', lava_core: '#ff5500', ice_crystal: '#aaddff' };
    const entries = Object.entries(materialInventory).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      const div = document.createElement('div');
      div.className = 'mat-item';
      div.innerHTML = '<span style="color:#667788">（背包空空如也）</span>';
      container.appendChild(div);
      return;
    }
    for (const [key, value] of entries) {
      const div = document.createElement('div');
      div.className = 'mat-item';
      div.innerHTML = `<span class="mat-icon" style="background:${colors[key] || '#fff'}"></span>${names[key] || key} ×${value}`;
      container.appendChild(div);
    }
  }

  function showToast(msg, duration = 2500) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = `
        position: absolute; top: 90px; left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8); color: #fff;
        padding: 10px 24px; border-radius: 24px;
        font-size: 14px; z-index: 800;
        border: 1px solid rgba(255,255,255,0.2);
        transition: opacity 0.3s; pointer-events: none;
      `;
      document.getElementById('game-container').appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, duration);
  }

  function setInteractPrompt(html) {
    const prompt = document.getElementById('interact-prompt');
    if (!prompt) return;
    if (html) {
      prompt.innerHTML = html;
      prompt.style.display = 'block';
    } else {
      prompt.style.display = 'none';
    }
  }

  function startDialog(name, lines, callback) {
    if (dialogOpen) return;
    dialogOpen = true;
    dialogQueue = lines.slice();
    dialogCallback = callback || null;
    document.getElementById('dialog-name').textContent = name;
    document.getElementById('dialog-box').style.display = 'block';
    showNextLine();
  }

  function showNextLine() {
    if (dialogQueue.length > 0) {
      document.getElementById('dialog-text').textContent = dialogQueue.shift();
    } else {
      endDialog();
    }
  }

  function advanceDialog() {
    if (!dialogOpen) return;
    showNextLine();
  }

  function endDialog() {
    dialogOpen = false;
    document.getElementById('dialog-box').style.display = 'none';
    if (dialogCallback) {
      const cb = dialogCallback;
      dialogCallback = null;
      cb();
    }
  }

  function isDialogOpen() { return dialogOpen; }

  function openForge() {
    forgeOpen = true;
    updateForgeInfo();
    document.getElementById('forge-panel').style.display = 'block';
  }
  function closeForge() {
    forgeOpen = false;
    document.getElementById('forge-panel').style.display = 'none';
  }
  function isForgePanelOpen() { return forgeOpen; }

  function upgradeWeapon() {
    const mats = materialInventory;
    const need = { iron: 2, wolf_fang: 1 };
    if ((mats.iron || 0) >= need.iron && (mats.wolf_fang || 0) >= need.wolf_fang) {
      mats.iron -= need.iron;
      mats.wolf_fang -= need.wolf_fang;
      PlayerController.upgradeWeapon();
      renderMaterials();
      showToast('武器升级成功！伤害提升！');
    } else {
      showToast('材料不足：需要铁矿×2、狼牙×1');
    }
  }

  function upgradeArmor() {
    const mats = materialInventory;
    const need = { iron: 2, slime_gel: 1 };
    if ((mats.iron || 0) >= need.iron && (mats.slime_gel || 0) >= need.slime_gel) {
      mats.iron -= need.iron;
      mats.slime_gel -= need.slime_gel;
      PlayerController.upgradeArmor();
      renderMaterials();
      showToast('护甲升级成功！减伤提升！');
    } else {
      showToast('材料不足：需要铁矿×2、史莱姆凝胶×1');
    }
  }

  function updateForgeInfo() {
    const state = PlayerController.getState();
    document.getElementById('weapon-level').textContent = 'Lv.' + state.weaponLevel;
    document.getElementById('armor-level').textContent = 'Lv.' + state.armorLevel;
    document.getElementById('weapon-upgrade-cost').textContent = '升级需要：铁矿×2、狼牙×1';
    document.getElementById('armor-upgrade-cost').textContent = '升级需要：铁矿×2、史莱姆凝胶×1';
  }

  function toggleQuests() {
    if (questOpen) closeQuests();
    else openQuests();
  }
  function openQuests() {
    questOpen = true;
    renderQuests();
    document.getElementById('quest-panel').style.display = 'block';
  }
  function closeQuests() {
    questOpen = false;
    document.getElementById('quest-panel').style.display = 'none';
  }
  function isQuestPanelOpen() { return questOpen; }

  function renderQuests() {
    const list = document.getElementById('quest-list');
    if (!list) return;
    list.innerHTML = '';
    for (const q of QUESTS) {
      const div = document.createElement('div');
      div.className = 'quest-item' + (q.done ? ' done' : '');
      const icon = q.type === 'main' ? '⭐' : '📜';
      div.innerHTML = `
        <div class="quest-icon">${icon}</div>
        <div class="quest-body">
          <div class="quest-title">${q.title}</div>
          <div class="quest-desc">${q.desc}</div>
          <div class="quest-progress">${q.done ? '✅ 已完成' : q.progress()}</div>
        </div>`;
      list.appendChild(div);
    }
  }

  function updateQuestProgress(id, done) {
    const q = QUESTS.find(x => x.id === id);
    if (q) {
      q.done = done;
      renderQuests();
    }
  }

  function getQuests() { return QUESTS; }

  return {
    init, update, updateHUD, updateStoneCount,
    addMaterial, getMaterials,
    showToast, setInteractPrompt,
    startDialog, advanceDialog, endDialog, isDialogOpen,
    openForge, closeForge, isForgePanelOpen,
    upgradeWeapon, upgradeArmor, updateForgeInfo,
    openQuests, closeQuests, toggleQuests, isQuestPanelOpen,
    updateQuestProgress, getQuests,
  };
})();
