// ==================== 敌人 AI ====================
const EnemyAI = (() => {
  let scene, playerMesh;
  let enemies = [];
  const ENEMY_DATA = [
    { type: 'slime', count: 6, x: 100, z: 60, radius: 80 },
    { type: 'wolf', count: 4, x: -250, z: 0, radius: 100 },
    { type: 'golem', count: 2, x: 30, z: 500, radius: 60 },
    { type: 'ice_wraith', count: 2, x: 0, z: -250, radius: 80 },
  ];

  function init(sc, pl) {
    scene = sc;
    playerMesh = pl;
  }

  function spawnAllEnemies() {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    for (const data of ENEMY_DATA) {
      const count = isMobile ? Math.ceil(data.count / 2) : data.count;
      for (let i = 0; i < count; i++) {
        spawnEnemy(data.type, data.x, data.z, data.radius);
      }
    }
  }

  function spawnEnemy(type, cx, cz, radius) {
    const enemy = WorldObjects.createEnemy(type);
    let x = 0, z = 0, y = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const tx = cx + Math.cos(angle) * dist;
      const tz = cz + Math.sin(angle) * dist;
      const ty = Terrain.getHeight(tx, tz);
      if (ty > Terrain.WATER_LEVEL + 2) {
        x = tx; z = tz; y = ty;
        break;
      }
    }
    enemy.position.set(x, y + 2, z);
    scene.add(enemy);
    enemies.push(enemy);
  }

  function getEnemies() { return enemies; }

  function damageEnemy(enemy, damage) {
    if (enemy.userData.health <= 0) return;
    enemy.userData.health -= damage;
    enemy.userData.hitFlash = 0.2;
    enemy.userData.state = 'combat';
    enemy.userData.alertState = 'alert';
    if (enemy.userData.health <= 0) {
      enemy.userData.health = 0;
      onEnemyDeath(enemy);
    }
  }

  function alarmEnemy(enemy) {
    if (enemy.userData.health <= 0) return;
    enemy.userData.state = 'alert';
    enemy.userData.alertState = 'alert';
  }

  function onEnemyDeath(enemy) {
    const dropTypes = {
      slime: 'slime_gel', wolf: 'wolf_fang', golem: 'lava_core', ice_wraith: 'ice_crystal',
    };
    const dropType = dropTypes[enemy.userData.enemyType] || 'slime_gel';
    const drop = WorldObjects.createDropItem(dropType);
    drop.position.set(enemy.position.x, Terrain.getHeight(enemy.position.x, enemy.position.z) + 1, enemy.position.z);
    scene.add(drop);
    UISystem.showToast(enemy.userData.isBoss ? '击倒了强敌！' : '击败敌人！获得' + enemy.userData.exp + '经验');
    enemy.userData.isDying = true;
    enemy.userData.dieTimer = 0.8;
  }

  function update(dt) {
    for (const enemy of enemies) {
      if (enemy.userData.health <= 0) {
        if (enemy.userData.isDying) {
          enemy.userData.dieTimer -= dt;
          if (enemy.userData.dieTimer <= 0) {
            scene.remove(enemy);
          }
        }
        continue;
      }

      const ud = enemy.userData;
      const px = playerMesh.position.x;
      const pz = playerMesh.position.z;
      const ex = enemy.position.x;
      const ez = enemy.position.z;
      const dx = px - ex;
      const dz = pz - ez;
      const dist = Math.sqrt(dx * dx + dz * dz);

      ud.attackCooldown = Math.max(0, (ud.attackCooldown || 0) - dt);
      const isSneaking = PlayerController.getIsSneaking();
      const playerVisible = !isSneaking;

      if (ud.enemyType === 'slime') {
        if (dist < 8 && playerVisible) {
          const dirX = -dx / dist;
          const dirZ = -dz / dist;
          enemy.position.x += dirX * ud.speed * dt;
          enemy.position.z += dirZ * ud.speed * dt;
          ud.state = 'flee';
          ud.alertState = 'alert';
        } else {
          patrol(enemy, dt);
          ud.alertState = 'idle';
        }
      } else if (ud.enemyType === 'wolf') {
        const detectRange = isSneaking ? 8 : 16;
        if (dist < detectRange && playerVisible) {
          const dirX = dx / dist;
          const dirZ = dz / dist;
          enemy.position.x += dirX * ud.speed * dt;
          enemy.position.z += dirZ * ud.speed * dt;
          ud.state = 'chase';
          ud.alertState = 'alert';
          enemy.rotation.y = Math.atan2(dx, dz);
          if (dist < 2.0 && ud.attackCooldown <= 0) {
            attackPlayer(enemy);
          }
        } else if (dist < detectRange * 2 && ud.alertState === 'alert') {
          ud.alertState = 'suspicious';
        } else {
          patrol(enemy, dt);
          ud.alertState = 'idle';
        }
      } else if (ud.enemyType === 'golem') {
        if (ud.state === 'combat') {
          const detectRange = isSneaking ? 12 : 20;
          if (dist < detectRange) {
            const dirX = dx / dist;
            const dirZ = dz / dist;
            enemy.position.x += dirX * ud.speed * dt;
            enemy.position.z += dirZ * ud.speed * dt;
            ud.alertState = 'alert';
            if (dist < 3.0 && ud.attackCooldown <= 0) {
              attackPlayer(enemy);
            }
          }
        } else {
          patrol(enemy, dt);
          ud.alertState = 'idle';
        }
      } else if (ud.enemyType === 'ice_wraith') {
        const detectRange = isSneaking ? 10 : 18;
        if (dist < detectRange && playerVisible) {
          const dirX = dx / dist;
          const dirZ = dz / dist;
          enemy.position.x += dirX * ud.speed * dt;
          enemy.position.z += dirZ * ud.speed * dt;
          ud.state = 'chase';
          ud.alertState = 'alert';
          enemy.position.y = Terrain.getHeight(ex, ez) + 2.5 + Math.sin(performance.now() * 0.003) * 0.5;
          if (dist < 2.5 && ud.attackCooldown <= 0) {
            attackPlayer(enemy);
          }
        } else {
          patrol(enemy, dt);
          ud.alertState = 'idle';
        }
      }

      const groundY = Terrain.getHeight(enemy.position.x, enemy.position.z);
      if (ud.enemyType !== 'ice_wraith') {
        if (enemy.position.y > groundY + 2) {
          enemy.position.y -= 12 * dt;
        } else {
          enemy.position.y = groundY + 2;
        }
      }

      if (ud.hitFlash > 0) {
        ud.hitFlash -= dt;
        enemy.visible = Math.floor(performance.now() / 40) % 2 === 0;
        if (ud.hitFlash <= 0) enemy.visible = true;
      }
    }
  }

  function attackPlayer(enemy) {
    const ud = enemy.userData;
    ud.attackCooldown = 1.2;
    PlayerController.takeDamage(ud.attackDamage);
    UISystem.showToast(ud.isBoss ? '遭到猛烈攻击！' : '受到攻击！');
    enemy.rotation.x = -0.3;
    setTimeout(() => { enemy.rotation.x = 0; }, 200);
  }

  function patrol(enemy, dt) {
    const ud = enemy.userData;
    if (!ud.spawnPos) {
      ud.spawnPos = { x: enemy.position.x, z: enemy.position.z };
    }
    if (!ud.idleTarget) {
      ud.idleTarget = {
        x: ud.spawnPos.x + (Math.random() - 0.5) * 30,
        z: ud.spawnPos.z + (Math.random() - 0.5) * 30,
      };
      ud.idleTimer = 0;
    }
    const tx = ud.idleTarget.x;
    const tz = ud.idleTarget.z;
    const dx = tx - enemy.position.x;
    const dz = tz - enemy.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1) {
      ud.idleTimer += dt;
      if (ud.idleTimer > 2) {
        ud.idleTarget = null;
        ud.idleTimer = 0;
      }
      return;
    }
    const speed = ud.speed * 0.3;
    enemy.position.x += (dx / dist) * speed * dt;
    enemy.position.z += (dz / dist) * speed * dt;
    enemy.rotation.y = Math.atan2(dx, dz);
  }

  return {
    init, spawnAllEnemies, update, damageEnemy, alarmEnemy, getEnemies,
  };
})();

// ==================== 资源采集系统 ====================
const ResourceSystem = (() => {
  let scene, player;
  const resources = [];

  function init(sc, pl) {
    scene = sc;
    player = pl;
    spawnResources();
  }

  function spawnResources() {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const herbCount = isMobile ? 6 : 12;
    for (let i = 0; i < herbCount; i++) {
      const x = -200 + Math.random() * 150;
      const z = (Math.random() - 0.5) * 300;
      spawnResource('herb', x, z);
    }
    const oreCount = isMobile ? 5 : 10;
    for (let i = 0; i < oreCount; i++) {
      const x = (Math.random() - 0.5) * 600;
      const z = 250 + Math.random() * 250;
      spawnResource('iron', x, z);
    }
    const fruitCount = isMobile ? 5 : 10;
    for (let i = 0; i < fruitCount; i++) {
      const x = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      spawnResource('fruit', x, z);
    }
  }

  function spawnResource(type, x, z) {
    const y = Terrain.getHeight(x, z);
    if (y < Terrain.WATER_LEVEL + 3) return;
    const group = new THREE.Group();
    const typeData = {
      herb: { color: 0x66cc66, size: 0.6, glow: 0x88ff88 },
      iron: { color: 0x9999aa, size: 0.8, glow: 0xcccccc },
      fruit: { color: 0xff6633, size: 0.7, glow: 0xffaa44 },
    };
    const td = typeData[type];
    let mesh;
    if (type === 'herb') {
      const leafMat = new THREE.MeshStandardMaterial({ color: td.color, emissive: td.glow, emissiveIntensity: 0.3, roughness: 0.6 });
      mesh = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 4), leafMat);
        leaf.position.set(Math.cos(i * Math.PI / 2) * 0.15, 0.35, Math.sin(i * Math.PI / 2) * 0.15);
        leaf.rotation.y = i * Math.PI / 2;
        leaf.rotation.z = 0.4;
        leaf.castShadow = true;
        mesh.add(leaf);
      }
    } else if (type === 'iron') {
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.9 });
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(td.size, 0), rockMat);
      rock.position.y = td.size * 0.5;
      rock.castShadow = true;
      mesh = new THREE.Group();
      mesh.add(rock);
      const oreMat = new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x88bbff, emissiveIntensity: 0.4, roughness: 0.3 });
      for (let i = 0; i < 3; i++) {
        const ore = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), oreMat);
        ore.position.set((Math.random() - 0.5) * td.size, td.size * 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * td.size);
        mesh.add(ore);
      }
    } else if (type === 'fruit') {
      mesh = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }));
      trunk.position.y = 0.6;
      mesh.add(trunk);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3a8c3a, roughness: 0.7 }));
      leaf.position.y = 1.6;
      mesh.add(leaf);
      const fruitMat = new THREE.MeshStandardMaterial({ color: td.color, emissive: td.glow, emissiveIntensity: 0.2, roughness: 0.4 });
      for (let i = 0; i < 5; i++) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), fruitMat);
        const a = (i / 5) * Math.PI * 2 + Math.random() * 0.3;
        fruit.position.set(Math.cos(a) * 0.5, 1.5 + Math.random() * 0.4, Math.sin(a) * 0.5);
        mesh.add(fruit);
      }
    }
    mesh.position.set(x, y + (type === 'herb' ? 0.2 : 0), z);
    group.add(mesh);
    const ringMat = new THREE.MeshBasicMaterial({ color: td.glow, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.3, 16), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    group.add(ring);
    group.userData = {
      type: 'resource', resourceType: type,
      originalY: y, spawnX: x, spawnZ: z,
    };
    scene.add(group);
    resources.push(group);
  }

  function getNearbyResource() {
    let closest = null;
    let minDist = 3.5;
    for (const res of resources) {
      const dx = res.position.x - player.position.x;
      const dz = res.position.z - player.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist && res.visible) {
        minDist = d;
        closest = res;
      }
    }
    return closest;
  }

  function collect(res) {
    const type = res.userData.resourceType;
    const names = { herb: '草药', iron: '铁矿', fruit: '果实' };
    UISystem.addMaterial(type, 1);
    UISystem.showToast('采集到' + names[type] + ' +1');
    res.visible = false;
    res.userData.respawnTimer = 30 + Math.random() * 15;
  }

  function update(dt) {
    for (const res of resources) {
      if (!res.visible && res.userData.respawnTimer > 0) {
        res.userData.respawnTimer -= dt;
        if (res.userData.respawnTimer <= 0) {
          res.visible = true;
        }
      }
      if (res.visible) {
        const t = performance.now() * 0.001;
        res.position.y = res.userData.originalY + 0.2 + Math.sin(t * 2 + res.position.x) * 0.15;
      }
    }
  }

  return { init, update, getNearbyResource, collect };
})();
