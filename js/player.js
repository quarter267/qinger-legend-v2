// ==================== 玩家控制器（三模式：PC / 手机 / 手柄）====================
const PlayerController = (() => {
  let mesh, camera, scene, terrainMesh;
  let controlMode = 'pc';

  const move = { x: 0, z: 0 };
  let mobileMoveX = 0, mobileMoveZ = 0;
  let isSprinting = false;
  let isGrounded = true;
  let velocityY = 0;
  let health = 100;
  let maxHealth = 100;
  let stamina = 100;
  let maxStamina = 100;
  let sneak = false;

  let attackCooldown = 0;
  let strongCooldown = 0;
  let rollCooldown = 0;
  let rollTime = 0;
  let isAttacking = false;
  let attackTimer = 0;
  let isInvincible = false;
  let invincibleTimer = 0;

  let yaw = 0;
  let pitch = 0;
  let cameraMode = 0;
  let pointerLocked = false;
  const CAMERA_MODES = ['third', 'first', 'front'];

  let stones = 5;
  let maxStones = 5;
  let stoneRechargeTimer = 0;
  let weaponLevel = 1;
  let armorLevel = 1;

  const GRAVITY = -25;
  const WALK_SPEED = 6;
  const SPRINT_SPEED = 10;
  const SNEAK_SPEED = 2.5;
  const JUMP_VELOCITY = 9;
  const PLAYER_RADIUS = 0.55;

  let regenTimer = 0;

  function init(pl, cam, sc, terr) {
    mesh = pl;
    camera = cam;
    scene = sc;
    terrainMesh = terr;
  }

  function setControlMode(mode) {
    controlMode = mode;
    if (mode !== 'pc') {
      if (document.pointerLockElement) document.exitPointerLock();
    }
    if (mode === 'pc') {
      yaw = 0; pitch = -0.1;
    }
  }

  function getControlMode() { return controlMode; }
  function getState() {
    return { health, maxHealth, stamina, maxStamina, sneak, weaponLevel, armorLevel, stones };
  }
  function getIsSneaking() { return sneak; }

  function heal(amount) {
    health = Math.min(maxHealth, health + amount);
  }

  function onKeyDown(e) {
    if (controlMode !== 'pc') return;
    switch (e.code) {
      case 'KeyW': move.z = -1; break;
      case 'KeyS': move.z = 1; break;
      case 'KeyA': move.x = -1; break;
      case 'KeyD': move.x = 1; break;
      case 'Space':
        e.preventDefault();
        tryJump();
        break;
      case 'ShiftLeft': case 'ShiftRight':
        isSprinting = true;
        break;
      case 'KeyC':
        sneak = !sneak;
        if (sneak) UISystem.showToast('进入潜行');
        else UISystem.showToast('结束潜行');
        break;
      case 'KeyQ':
        throwStone();
        break;
      case 'KeyF':
        tryRoll();
        break;
    }
  }

  function onKeyUp(e) {
    if (controlMode !== 'pc') return;
    switch (e.code) {
      case 'KeyW': move.z = 0; break;
      case 'KeyS': move.z = 0; break;
      case 'KeyA': move.x = 0; break;
      case 'KeyD': move.x = 0; break;
      case 'ShiftLeft': case 'ShiftRight': isSprinting = false; break;
    }
  }

  function onMouseMove(e) {
    if (controlMode !== 'pc') return;
    if (pointerLocked) {
      const sensitivity = 0.0025;
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
    }
  }

  function onMouseDown(e) {
    if (controlMode !== 'pc') return;
    if (e.button === 0) {
      tryAttack();
    }
  }
  function onMouseUp(e) {
    if (controlMode !== 'pc') return;
    if (e.button === 0) {
      isAttacking = false;
    }
  }

  function setPointerLocked(locked) {
    pointerLocked = locked;
  }

  function setMobileMove(x, z) {
    mobileMoveX = x;
    mobileMoveZ = z;
  }

  function setSprinting(v) { isSprinting = v; }

  function addYawPitch(dx, dy) {
    yaw -= dx * 0.005;
    pitch -= dy * 0.005;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
  }

  function tryAttack() {
    if (controlMode === 'pc') return;
    if (attackCooldown > 0 || rollTime > 0) return;
    attackCooldown = 0.4;
    doAttack(1.0);
  }

  function tryStrongAttack() {
    if (strongCooldown > 0 || rollTime > 0) return;
    strongCooldown = 2.0;
    attackCooldown = 0.6;
    doAttack(2.0);
    UISystem.showToast('强力一击！');
  }

  function tryAgileAttack() {
    if (attackCooldown > 0 || rollTime > 0) return;
    attackCooldown = 0.3;
    doAttack(0.7, true);
    UISystem.showToast('敏捷突进！');
  }

  function doAttack(multiplier, isAgile) {
    isAttacking = true;
    attackTimer = 0.25;

    const userData = mesh.userData;
    if (userData.sword) {
      userData.sword.rotation.x = -1.2;
      userData.sword.rotation.z = -0.9;
    }
    if (isAgile) {
      const forward = getForward();
      mesh.position.x += forward.x * 3;
      mesh.position.z += forward.z * 3;
    }

    const damage = (10 + weaponLevel * 5) * multiplier;
    const range = 3.5;

    scene.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'enemy' && obj.userData.health > 0) {
        const dx = obj.position.x - mesh.position.x;
        const dz = obj.position.z - mesh.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < range) {
          const forward = getForward();
          const dirX = dx / (d || 1);
          const dirZ = dz / (d || 1);
          const dot = forward.x * dirX + forward.z * dirZ;
          if (dot > 0.3) {
            EnemyAI.damageEnemy(obj, damage);
          }
        }
      }
    });

    const vg = document.getElementById('damage-vignette');
    if (vg) {
      vg.style.boxShadow = 'inset 0 0 100px 20px rgba(255,255,255,0.15)';
      setTimeout(() => { vg.style.boxShadow = 'inset 0 0 100px 30px rgba(255,0,0,0)'; }, 60);
    }
  }

  function throwStone() {
    if (stones <= 0) { UISystem.showToast('石子不足，等待恢复'); return; }
    if (rollTime > 0) return;
    stones--;
    UISystem.updateStoneCount(stones);

    const forward = getForward();
    const start = mesh.position.clone();
    start.y += 1.5;

    const stone = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.8 })
    );
    stone.position.copy(start);
    stone.userData = {
      type: 'thrownStone',
      velocity: forward.clone().multiplyScalar(30),
      life: 0,
    };
    scene.add(stone);

    UISystem.showToast('扔出石子');
  }

  function updateThrownStones(dt) {
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.type === 'thrownStone') {
        obj.userData.life += dt;
        if (obj.userData.life > 2.5) {
          scene.remove(obj);
          return;
        }
        obj.userData.velocity.y -= GRAVITY * 0.5 * dt;
        obj.position.addScaledVector(obj.userData.velocity, dt);

        const groundY = Terrain.getHeight(obj.position.x, obj.position.z);
        if (obj.position.y < groundY + 0.1) {
          scene.traverse((enemy) => {
            if (enemy.userData && enemy.userData.type === 'enemy' && enemy.userData.health > 0) {
              const dx = enemy.position.x - obj.position.x;
              const dz = enemy.position.z - obj.position.z;
              const d = Math.sqrt(dx * dx + dz * dz);
              if (d < 12) {
                EnemyAI.alarmEnemy(enemy);
              }
            }
          });
          scene.remove(obj);
        }
      }
    });
  }

  function tryJump() {
    if (!isGrounded || rollTime > 0) return;
    velocityY = JUMP_VELOCITY;
    isGrounded = false;
  }

  function tryRoll() {
    if (rollCooldown > 0 || rollTime > 0) return;
    if (stamina < 15) { UISystem.showToast('耐力不足'); return; }
    stamina -= 15;
    rollTime = 0.4;
    rollCooldown = 1.0;
    isInvincible = true;
    invincibleTimer = 0.4;
    UISystem.showToast('翻滚闪避');
  }

  function cycleCameraMode() {
    cameraMode = (cameraMode + 1) % 3;
    return CAMERA_MODES[cameraMode];
  }

  function getForward() {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    return { x: -sy, z: -cy };
  }

  function update(dt) {
    attackCooldown = Math.max(0, attackCooldown - dt);
    strongCooldown = Math.max(0, strongCooldown - dt);
    rollCooldown = Math.max(0, rollCooldown - dt);
    if (rollTime > 0) rollTime -= dt;
    if (invincibleTimer > 0) invincibleTimer -= dt;
    else isInvincible = false;

    if (isAttacking) {
      attackTimer -= dt;
      if (attackTimer <= 0) {
        isAttacking = false;
        const ud = mesh.userData;
        if (ud.sword) {
          ud.sword.rotation.x = ud.sword.userData.baseRot.x;
          ud.sword.rotation.z = ud.sword.userData.baseRot.z;
        }
      }
    }

    if (stamina < maxStamina) {
      stamina = Math.min(maxStamina, stamina + (sneak ? 8 : 12) * dt);
    }

    if (health < maxHealth) {
      regenTimer += dt;
      if (regenTimer > 5) {
        health = Math.min(maxHealth, health + 2 * dt);
      }
    } else {
      regenTimer = 0;
    }

    if (stones < maxStones) {
      stoneRechargeTimer += dt;
      if (stoneRechargeTimer > 10) {
        stoneRechargeTimer = 0;
        stones++;
        UISystem.updateStoneCount(stones);
      }
    }

    let inputX = 0, inputZ = 0;
    if (controlMode === 'pc') {
      inputX = move.x;
      inputZ = move.z;
    } else if (controlMode === 'mobile') {
      inputX = mobileMoveX;
      inputZ = mobileMoveZ;
    } else if (controlMode === 'gamepad') {
      inputX = getGamepadMoveX();
      inputZ = getGamepadMoveZ();
    }

    const isMoving = Math.abs(inputX) > 0.05 || Math.abs(inputZ) > 0.05;

    if (controlMode === 'mobile' || controlMode === 'gamepad') {
      const f = getForward();
      const right = { x: f.z, z: -f.x };
      let moveX = 0, moveZ = 0;
      moveX = inputX * right.x + inputZ * f.x;
      moveZ = inputX * right.z + inputZ * f.z;

      const speed = sneak ? SNEAK_SPEED : (isSprinting ? SPRINT_SPEED : WALK_SPEED);
      const vx = moveX * speed;
      const vz = moveZ * speed;

      applyMovement(vx, vz, dt);

      if (isMoving) {
        const targetYaw = Math.atan2(moveX, moveZ);
        let diff = targetYaw - yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        yaw += diff * Math.min(1, dt * 10);
        mesh.rotation.y = targetYaw;
      }
    } else {
      const speed = sneak ? SNEAK_SPEED : (isSprinting ? SPRINT_SPEED : WALK_SPEED);
      const vx = inputX * speed;
      const vz = inputZ * speed;

      applyMovement(vx, vz, dt);

      if (isMoving) {
        const targetYaw = Math.atan2(inputX, inputZ);
        mesh.rotation.y = targetYaw;
      }
    }

    if (!isGrounded) {
      velocityY += GRAVITY * dt;
    }

    const groundY = Terrain.getHeight(mesh.position.x, mesh.position.z);
    if (mesh.position.y <= groundY + 2 && velocityY <= 0) {
      mesh.position.y = groundY + 2;
      velocityY = 0;
      isGrounded = true;
    } else {
      mesh.position.y += velocityY * dt;
      isGrounded = false;
    }

    animatePlayer(isMoving, dt);
    updateCamera(dt);
    updateInvincibleEffect();
  }

  function applyMovement(vx, vz, dt) {
    let newX = mesh.position.x + vx * dt;
    let newZ = mesh.position.z + vz * dt;

    const resolved = CollisionSystem.resolveCollision(newX, newZ, PLAYER_RADIUS);
    newX = resolved.x;
    newZ = resolved.z;

    const half = Terrain.WORLD_SIZE / 2 - 20;
    newX = Math.max(-half, Math.min(half, newX));
    newZ = Math.max(-half, Math.min(half, newZ));

    mesh.position.x = newX;
    mesh.position.z = newZ;
  }

  function getGamepadMoveX() {
    const gp = navigator.getGamepads && navigator.getGamepads()[0];
    if (gp && gp.connected) {
      return -gp.axes[0] || 0;
    }
    return 0;
  }
  function getGamepadMoveZ() {
    const gp = navigator.getGamepads && navigator.getGamepads()[0];
    if (gp && gp.connected) {
      return -gp.axes[1] || 0;
    }
    return 0;
  }

  function animatePlayer(isMoving, dt) {
    const t = performance.now() * 0.001;
    const swing = isMoving ? Math.sin(t * 12) * (sneak ? 0.1 : 0.5) : 0;
    const ud = mesh.userData;
    if (ud.rightArm) {
      ud.rightArm.rotation.x = swing * 0.8;
    }
    if (ud.leftArm) {
      ud.leftArm.rotation.x = -swing * 0.8;
    }
    if (rollTime > 0) {
      mesh.rotation.x = rollTime * 8;
    } else {
      mesh.rotation.x = 0;
    }
  }

  function updateInvincibleEffect() {
    if (isInvincible) {
      mesh.visible = Math.floor(performance.now() / 50) % 2 === 0;
    } else {
      mesh.visible = true;
    }
  }

  function updateCamera(dt) {
    const mode = CAMERA_MODES[cameraMode];

    if (mode === 'first') {
      const eyeY = mesh.position.y + 1.6;
      const f = getForward();
      camera.position.set(mesh.position.x, eyeY, mesh.position.z);
      camera.lookAt(mesh.position.x + f.x * 10, eyeY, mesh.position.z + f.z * 10);
    } else {
      let dist = 8;
      let height = 4.5;
      let offsetForward = 0;

      if (mode === 'front') {
        dist = 7;
        height = 4;
        offsetForward = 1;
      }

      const f = getForward();

      const horizontal = Math.cos(pitch);
      const camOffsetX = Math.sin(yaw) * dist * horizontal * (offsetForward === 0 ? 1 : -1);
      const camOffsetZ = Math.cos(yaw) * dist * horizontal * (offsetForward === 0 ? 1 : -1);
      const camOffsetY = Math.sin(pitch) * dist;

      camera.position.set(
        mesh.position.x + camOffsetX,
        mesh.position.y + height + camOffsetY,
        mesh.position.z + camOffsetZ
      );

      const target = new THREE.Vector3(
        mesh.position.x + Math.sin(yaw) * Math.cos(pitch) * 5,
        mesh.position.y + 1.5 + Math.sin(pitch) * 5,
        mesh.position.z + Math.cos(yaw) * Math.cos(pitch) * 5
      );
      camera.lookAt(target);
    }

    const camGround = Terrain.getHeight(camera.position.x, camera.position.z);
    if (camera.position.y < camGround + 1.5) {
      camera.position.y = camGround + 1.5;
    }
  }

  function setHealth(d) { health = Math.max(0, Math.min(maxHealth, d)); }
  function takeDamage(d) {
    if (isInvincible) return 0;
    const actual = d * (1 - armorLevel * 0.08);
    health -= actual;
    const vg = document.getElementById('damage-vignette');
    if (vg) vg.style.boxShadow = 'inset 0 0 100px 30px rgba(255,0,0,0.6)';
    if (vg) setTimeout(() => { vg.style.boxShadow = 'inset 0 0 100px 30px rgba(255,0,0,0)'; }, 150);

    if (health <= 0) {
      health = 0;
      handleDeath();
    }
    return actual;
  }
  function healPlayer(amount) { heal(amount); }

  function handleDeath() {
    UISystem.showToast('你倒下了…重新起身');
    health = maxHealth;
    stamina = maxStamina;
    const spawnY = Terrain.getHeight(0, 0);
    mesh.position.set(0, spawnY + 2, 0);
  }

  function upgradeWeapon() { weaponLevel++; }
  function upgradeArmor() { armorLevel++; }

  return {
    init, setControlMode, getControlMode,
    onKeyDown, onKeyUp, onMouseMove, onMouseDown, onMouseUp,
    setPointerLocked, setMobileMove, setSprinting, addYawPitch,
    tryAttack, tryStrongAttack, tryAgileAttack,
    throwStone, tryJump, tryRoll, cycleCameraMode,
    update, updateThrownStones, getState, getIsSneaking,
    takeDamage, heal, healPlayer, setHealth,
    upgradeWeapon, upgradeArmor,
    updateCamera, getForward,
  };
})();
