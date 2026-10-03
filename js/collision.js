// ==================== 碰撞系统 ====================
// 球体 vs AABB 碰撞检测与解算
const CollisionSystem = (() => {
  const colliders = [];

  function addBox(centerX, centerZ, halfW, halfD, tag = 'wall') {
    colliders.push({
      minX: centerX - halfW,
      maxX: centerX + halfW,
      minZ: centerZ - halfD,
      maxZ: centerZ + halfD,
      tag,
    });
  }

  function addFromMeshGroup(group, opts = {}) {
    const shrinkX = opts.shrinkX || 0;
    const shrinkZ = opts.shrinkZ || 0;
    const ignoreDoor = opts.ignoreDoor !== undefined ? opts.ignoreDoor : true;

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    group.traverse((child) => {
      if (!child.isMesh) return;
      if (child.userData && child.userData.noCollision) return;
      if (child.geometry && child.geometry.parameters) {
        const p = child.geometry.parameters;
        let hw = 0, hd = 0;
        if (p.width !== undefined && p.depth !== undefined) {
          hw = p.width / 2;
          hd = p.depth / 2;
        } else if (p.radius !== undefined) {
          hw = p.radius;
          hd = p.radius;
        } else if (p.radiusTop !== undefined) {
          hw = Math.max(p.radiusTop, p.radiusBottom || 0);
          hd = hw;
        } else {
          return;
        }

        const localX = child.position.x;
        const localZ = child.position.z;
        const cosY = Math.cos(group.rotation.y);
        const sinY = Math.sin(group.rotation.y);

        const worldOffsetX = localX * cosY - localZ * sinY;
        const worldOffsetZ = localX * sinY + localZ * cosY;

        const rotHW = Math.abs(hw * cosY) + Math.abs(hd * sinY);
        const rotHD = Math.abs(hw * sinY) + Math.abs(hd * cosY);

        const wx = group.position.x + worldOffsetX;
        const wz = group.position.z + worldOffsetZ;

        minX = Math.min(minX, wx - rotHW);
        maxX = Math.max(maxX, wx + rotHW);
        minZ = Math.min(minZ, wz - rotHD);
        maxZ = Math.max(maxZ, wz + rotHD);
      }
    });

    if (minX === Infinity) return null;

    if (shrinkX > 0) { minX += shrinkX; maxX -= shrinkX; }
    if (shrinkZ > 0) { minZ += shrinkZ; maxZ -= shrinkZ; }

    if (ignoreDoor && opts.isHouse) {
      const doorWidth = opts.doorWidth || 1.8;
      const frontZ = maxZ;
      const wallThickness = 0.5;

      const leftBox = {
        minX: minX, maxX: minX + (maxX - minX) / 2 - doorWidth / 2,
        minZ: frontZ - wallThickness, maxZ: frontZ,
        tag: 'wall_left',
      };
      const rightBox = {
        minX: minX + (maxX - minX) / 2 + doorWidth / 2, maxX: maxX,
        minZ: frontZ - wallThickness, maxZ: frontZ,
        tag: 'wall_right',
      };

      const backBox = {
        minX, maxX,
        minZ: minZ, maxZ: minZ + wallThickness,
        tag: 'wall_back',
      };

      const leftSideBox = {
        minX: minX, maxX: minX + wallThickness,
        minZ, maxZ,
        tag: 'wall_side_left',
      };

      const rightSideBox = {
        minX: maxX - wallThickness, maxX: maxX,
        minZ, maxZ,
        tag: 'wall_side_right',
      };

      colliders.push(leftBox, rightBox, backBox, leftSideBox, rightSideBox);
      return [leftBox, rightBox, backBox, leftSideBox, rightSideBox];
    }

    const box = { minX, maxX, minZ, maxZ, tag: opts.tag || 'obstacle' };
    colliders.push(box);
    return box;
  }

  function addCollider(minX, maxX, minZ, maxZ, tag = 'obstacle') {
    colliders.push({ minX, maxX, minZ, maxZ, tag });
  }

  function clear() {
    colliders.length = 0;
  }

  function resolveCollision(playerX, playerZ, radius) {
    let x = playerX;
    let z = playerZ;

    for (let iter = 0; iter < 5; iter++) {
      let resolved = true;

      for (const box of colliders) {
        const insideX = x > box.minX && x < box.maxX;
        const insideZ = z > box.minZ && z < box.maxZ;

        if (insideX && insideZ) {
          const distLeft = x - box.minX;
          const distRight = box.maxX - x;
          const distBottom = z - box.minZ;
          const distTop = box.maxZ - z;

          const minDist = Math.min(distLeft, distRight, distBottom, distTop);
          const push = minDist + radius + 0.001;

          if (minDist === distLeft) {
            x = box.minX - push;
          } else if (minDist === distRight) {
            x = box.maxX + push;
          } else if (minDist === distBottom) {
            z = box.minZ - push;
          } else {
            z = box.maxZ + push;
          }
          resolved = false;
        } else {
          const closestX = Math.max(box.minX, Math.min(x, box.maxX));
          const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
          const dx = x - closestX;
          const dz = z - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < radius * radius && distSq > 0.000001) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            x += (dx / dist) * overlap;
            z += (dz / dist) * overlap;
            resolved = false;
          }
        }
      }

      if (resolved) break;
    }

    return { x, z };
  }

  function checkCollision(px, pz, radius) {
    for (const box of colliders) {
      const closestX = Math.max(box.minX, Math.min(px, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));
      const dx = px - closestX;
      const dz = pz - closestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  function getAllColliders() { return colliders; }

  return {
    addBox,
    addFromMeshGroup,
    addCollider,
    clear,
    resolveCollision,
    checkCollision,
    getAllColliders,
  };
})();
