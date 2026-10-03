// ==================== 小地图 + 大地图 ====================
const Minimap = (() => {
  let playerMesh, scene;
  let ctx, canvas;
  let bigMapOpen = false;

  function init(pl, sc, worldInfo) {
    playerMesh = pl;
    scene = sc;
    canvas = document.getElementById('minimap');
    ctx = canvas.getContext('2d');
    render();
  }

  function setBigMapOpen(open) {
    bigMapOpen = open;
  }

  function isBigMapOpen() { return bigMapOpen; }

  function update() {
    render();
  }

  function render() {
    if (!ctx || !playerMesh) return;
    const size = canvas.width;
    const half = size / 2;

    ctx.clearRect(0, 0, size, size);

    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, '#4a7a4a');
    gradient.addColorStop(1, '#3a5a3a');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    const viewRadius = 300;
    const scale = half / viewRadius;
    const px = playerMesh.position.x;
    const pz = playerMesh.position.z;
    const W = Terrain.WORLD_SIZE;

    const biomePoints = {
      PLAINS: { x: 0.5, y: 0.5, color: '#66bb55', label: '青耳原野' },
      DESERT: { x: 0.92, y: 0.5, color: '#ddaa66', label: '赤沙雅丹' },
      SNOW:   { x: 0.5, y: 0.08, color: '#aaddff', label: '寒渊雪原' },
      FOREST: { x: 0.08, y: 0.5, color: '#3a7a3a', label: '幽暗古林' },
      LAVA:   { x: 0.5, y: 0.92, color: '#ff6633', label: '熔岩裂谷' },
    };
    for (const [key, b] of Object.entries(biomePoints)) {
      const wx = (b.x - 0.5) * W;
      const wz = (b.y - 0.5) * W;
      const dx = wx - px;
      const dz = wz - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < viewRadius) {
        const sx = half + dx * scale;
        const sy = half + dz * scale;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.label, sx, sy - 8);
      }
    }

    scene.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enemy' && obj.userData.health > 0) {
        const dx = obj.position.x - px;
        const dz = obj.position.z - pz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < viewRadius) {
          const sx = half + dx * scale;
          const sy = half + dz * scale;
          ctx.fillStyle = obj.userData.isBoss ? '#ff2222' : '#ff8844';
          ctx.beginPath();
          ctx.arc(sx, sy, obj.userData.isBoss ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    scene.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'resource' && obj.visible) {
        const dx = obj.position.x - px;
        const dz = obj.position.z - pz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < viewRadius) {
          const sx = half + dx * scale;
          const sy = half + dz * scale;
          ctx.fillStyle = '#ffdd66';
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }
      }
    });

    scene.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'npc') {
        const dx = obj.position.x - px;
        const dz = obj.position.z - pz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < viewRadius) {
          const sx = half + dx * scale;
          const sy = half + dz * scale;
          ctx.fillStyle = '#44aaff';
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(half, half, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(half, half, 5, 0, Math.PI * 2);
    ctx.stroke();

    const yaw = playerMesh.rotation.y;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(half, half);
    ctx.lineTo(half + Math.sin(yaw) * 12, half + Math.cos(yaw) * 12);
    ctx.stroke();
  }

  function renderBig(bigCanvas) {
    if (!bigCanvas) return;
    const bctx = bigCanvas.getContext('2d');
    const size = bigCanvas.width;
    const W = Terrain.WORLD_SIZE;

    const bg = bctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, '#2a4a3a');
    bg.addColorStop(1, '#1a2a3a');
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, size, size);

    const biomes = {
      PLAINS: { x: 0.5, y: 0.5, color: '#66bb55', label: '青耳原野' },
      DESERT: { x: 0.92, y: 0.5, color: '#ddaa66', label: '赤沙雅丹' },
      SNOW:   { x: 0.5, y: 0.08, color: '#aaddff', label: '寒渊雪原' },
      FOREST: { x: 0.08, y: 0.5, color: '#3a7a3a', label: '幽暗古林' },
      LAVA:   { x: 0.5, y: 0.92, color: '#ff6633', label: '熔岩裂谷' },
    };
    for (const [key, b] of Object.entries(biomes)) {
      const cx = b.x * size;
      const cy = b.y * size;
      bctx.fillStyle = b.color + '44';
      bctx.beginPath();
      bctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
      bctx.fill();
      bctx.fillStyle = b.color;
      bctx.beginPath();
      bctx.arc(cx, cy, 8, 0, Math.PI * 2);
      bctx.fill();
      bctx.strokeStyle = 'rgba(255,255,255,0.5)';
      bctx.lineWidth = 2;
      bctx.stroke();
      bctx.fillStyle = '#fff';
      bctx.font = 'bold 14px sans-serif';
      bctx.textAlign = 'center';
      bctx.fillText(b.label, cx, cy + 26);
    }

    bctx.fillStyle = '#ffdd44';
    bctx.beginPath();
    bctx.arc(size * 0.5, size * 0.5, 10, 0, Math.PI * 2);
    bctx.fill();
    bctx.fillStyle = '#fff';
    bctx.font = 'bold 12px sans-serif';
    bctx.fillText('青耳村', size * 0.5, size * 0.5 + 32);

    const enemyZones = [
      { x: 0.5, y: 0.62, color: '#ff2222', label: '史莱姆' },
      { x: 0.30, y: 0.5, color: '#ff8844', label: '野狼' },
      { x: 0.5, y: 0.80, color: '#ff5555', label: '石巨人' },
      { x: 0.5, y: 0.20, color: '#88ccff', label: '冰灵' },
    ];
    for (const z of enemyZones) {
      bctx.fillStyle = z.color;
      bctx.font = '12px sans-serif';
      bctx.textAlign = 'center';
      bctx.fillText('⚠ ' + z.label, z.x * size, z.y * size);
    }

    const px = playerMesh ? playerMesh.position.x : 0;
    const pz = playerMesh ? playerMesh.position.z : 0;
    const mapX = (px / W + 0.5) * size;
    const mapZ = (pz / W + 0.5) * size;
    bctx.fillStyle = '#ffffff';
    bctx.beginPath();
    bctx.arc(mapX, mapZ, 7, 0, Math.PI * 2);
    bctx.fill();
    bctx.strokeStyle = '#000';
    bctx.lineWidth = 2;
    bctx.stroke();
    bctx.fillStyle = '#fff';
    bctx.font = 'bold 12px sans-serif';
    bctx.fillText('你', mapX, mapZ + 24);

    bctx.font = '10px sans-serif';
    bctx.textAlign = 'left';
    bctx.fillStyle = 'rgba(255,255,255,0.8)';
    bctx.fillText('● 五域 · ★ 村庄 · 白点 你', 20, size - 20);
  }

  return {
    init, update, render, renderBig, setBigMapOpen, isBigMapOpen,
  };
})();
