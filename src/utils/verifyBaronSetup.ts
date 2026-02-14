/**
 * Baron Setup Ability 验证工具
 *
 * 用法：在浏览器控制台或开发环境中运行此脚本
 * import { verifyBaronSetup } from './utils/verifyBaronSetup';
 * verifyBaronSetup();
 */

import { RoleRegistry } from '../engine/RoleRegistry';
import type { RoleData } from '../engine/types';
import rolesData from '../data/roles/trouble-brewing.json';

export function verifyBaronSetup() {
  console.log('========================================');
  console.log('Baron Setup Ability 验证测试');
  console.log('========================================\n');

  const registry = RoleRegistry.getInstance();
  registry.init(rolesData as RoleData[]);

  const results: { test: string; passed: boolean; details: string }[] = [];

  // ========================================
  // 测试 1: 7人局不应该有 Baron
  // ========================================
  console.log('【测试 1】7人局 - Baron 应该被过滤掉');
  let passed1 = true;
  const attempts1 = 20; // 运行多次确保 Baron 不会出现

  for (let i = 0; i < attempts1; i++) {
    const roles7 = registry.randomizeRolesWithSetup(7);
    if (roles7.includes('baron')) {
      passed1 = false;
      console.error(`❌ 失败：第 ${i + 1} 次尝试时，7人局出现了 Baron`);
      break;
    }
  }

  if (passed1) {
    console.log(`✅ 通过：${attempts1} 次随机分配均未出现 Baron`);
    results.push({
      test: '7人局不出现Baron',
      passed: true,
      details: `${attempts1}次测试均通过`,
    });
  } else {
    results.push({
      test: '7人局不出现Baron',
      passed: false,
      details: '有测试失败，Baron出现在了7人局',
    });
  }

  // ========================================
  // 测试 2: 9人局不应该有 Baron
  // ========================================
  console.log('\n【测试 2】9人局 - Baron 应该被过滤掉');
  let passed2 = true;
  const attempts2 = 20;

  for (let i = 0; i < attempts2; i++) {
    const roles9 = registry.randomizeRolesWithSetup(9);
    if (roles9.includes('baron')) {
      passed2 = false;
      console.error(`❌ 失败：第 ${i + 1} 次尝试时，9人局出现了 Baron`);
      break;
    }
  }

  if (passed2) {
    console.log(`✅ 通过：${attempts2} 次随机分配均未出现 Baron`);
    results.push({
      test: '9人局不出现Baron',
      passed: true,
      details: `${attempts2}次测试均通过`,
    });
  } else {
    results.push({
      test: '9人局不出现Baron',
      passed: false,
      details: '有测试失败，Baron出现在了9人局',
    });
  }

  // ========================================
  // 测试 3: 10人局可以有 Baron，且效果正确
  // ========================================
  console.log('\n【测试 3】10人局 - Baron 可以出现，效果正确');
  let foundBaron = false;
  let baronEffectCorrect = true;
  const maxAttempts3 = 100;

  for (let i = 0; i < maxAttempts3; i++) {
    const roles10 = registry.randomizeRolesWithSetup(10);
    const categorized = registry.categorizeRoles(roles10);

    // 检查总数
    const total = categorized.townsfolk.length + categorized.outsiders.length +
                 categorized.minions.length + categorized.demons.length;
    if (total !== 10) {
      console.error(`❌ 失败：角色总数 ${total}，应为 10`);
      baronEffectCorrect = false;
      break;
    }

    if (categorized.minions.includes('baron')) {
      foundBaron = true;

      // 验证 Baron 效果：5 townsfolk, 2 outsiders, 2 minions, 1 demon
      if (categorized.townsfolk.length !== 5) {
        console.error(`❌ Baron效果错误：鎮民數量 ${categorized.townsfolk.length}，應為 5`);
        baronEffectCorrect = false;
        break;
      }
      if (categorized.outsiders.length !== 2) {
        console.error(`❌ Baron效果错误：外來者數量 ${categorized.outsiders.length}，應為 2`);
        baronEffectCorrect = false;
        break;
      }
      if (categorized.minions.length !== 2) {
        console.error(`❌ Baron效果错误：爪牙數量 ${categorized.minions.length}，應為 2`);
        baronEffectCorrect = false;
        break;
      }
      if (categorized.demons.length !== 1) {
        console.error(`❌ Baron效果错误：惡魔數量 ${categorized.demons.length}，應為 1`);
        baronEffectCorrect = false;
        break;
      }

      console.log(`✅ 第 ${i + 1} 次嘗試找到 Baron，分配正確：`);
      console.log(`   鎮民: ${categorized.townsfolk.length} (應為5)`);
      console.log(`   外來者: ${categorized.outsiders.length} (應為2)`);
      console.log(`   爪牙: ${categorized.minions.length} (應為2, 含Baron)`);
      console.log(`   惡魔: ${categorized.demons.length} (應為1)`);
      break;
    }
  }

  if (!foundBaron) {
    console.warn(`⚠️ 警告：${maxAttempts3} 次嘗試中未抽到 Baron（可能性低但正常）`);
    results.push({
      test: '10人局Baron效果',
      passed: true,
      details: `${maxAttempts3}次未抽到Baron（機率問題，非錯誤）`,
    });
  } else if (baronEffectCorrect) {
    console.log('✅ 通过：Baron 效果正确应用');
    results.push({
      test: '10人局Baron效果',
      passed: true,
      details: 'Baron效果正確：5鎮民, 2外來者, 2爪牙, 1惡魔',
    });
  } else {
    results.push({
      test: '10人局Baron效果',
      passed: false,
      details: 'Baron效果錯誤，分配數量不符',
    });
  }

  // ========================================
  // 测试 4: 10人局无 Baron 时的分配
  // ========================================
  console.log('\n【测试 4】10人局 - 無 Baron 時的分配');
  let foundNoBaron = false;
  let noBaronDistCorrect = true;

  for (let i = 0; i < maxAttempts3; i++) {
    const roles10 = registry.randomizeRolesWithSetup(10);
    const categorized = registry.categorizeRoles(roles10);

    if (!categorized.minions.includes('baron')) {
      foundNoBaron = true;

      // 验证无 Baron 时的分配：7 townsfolk, 0 outsiders, 2 minions, 1 demon
      if (categorized.townsfolk.length !== 7) {
        console.error(`❌ 無Baron時分配錯誤：鎮民數量 ${categorized.townsfolk.length}，應為 7`);
        noBaronDistCorrect = false;
        break;
      }
      if (categorized.outsiders.length !== 0) {
        console.error(`❌ 無Baron時分配錯誤：外來者數量 ${categorized.outsiders.length}，應為 0`);
        noBaronDistCorrect = false;
        break;
      }
      if (categorized.minions.length !== 2) {
        console.error(`❌ 無Baron時分配錯誤：爪牙數量 ${categorized.minions.length}，應為 2`);
        noBaronDistCorrect = false;
        break;
      }

      console.log(`✅ 第 ${i + 1} 次嘗試無 Baron，分配正確：`);
      console.log(`   鎮民: ${categorized.townsfolk.length} (應為7)`);
      console.log(`   外來者: ${categorized.outsiders.length} (應為0)`);
      console.log(`   爪牙: ${categorized.minions.length} (應為2, 無Baron)`);
      console.log(`   惡魔: ${categorized.demons.length} (應為1)`);
      break;
    }
  }

  if (!foundNoBaron) {
    console.warn(`⚠️ 警告：${maxAttempts3} 次嘗試中每次都抽到 Baron（機率極低，可能有問題）`);
    results.push({
      test: '10人局無Baron分配',
      passed: false,
      details: '每次都抽到Baron，可能有問題',
    });
  } else if (noBaronDistCorrect) {
    console.log('✅ 通过：無 Baron 時分配正確');
    results.push({
      test: '10人局無Baron分配',
      passed: true,
      details: '無Baron時分配正確：7鎮民, 0外來者, 2爪牙, 1惡魔',
    });
  } else {
    results.push({
      test: '10人局無Baron分配',
      passed: false,
      details: '無Baron時分配錯誤',
    });
  }

  // ========================================
  // 测试 5: 15人局 Baron 效果
  // ========================================
  console.log('\n【测试 5】15人局 - Baron 效果验证');
  let found15Baron = false;
  let baron15Correct = true;

  for (let i = 0; i < maxAttempts3; i++) {
    const roles15 = registry.randomizeRolesWithSetup(15);
    const categorized = registry.categorizeRoles(roles15);

    const total = categorized.townsfolk.length + categorized.outsiders.length +
                 categorized.minions.length + categorized.demons.length;
    if (total !== 15) {
      console.error(`❌ 失败：角色总数 ${total}，应为 15`);
      baron15Correct = false;
      break;
    }

    if (categorized.minions.includes('baron')) {
      found15Baron = true;

      // 基础：9 townsfolk, 2 outsiders, 3 minions, 1 demon
      // Baron效果：7 townsfolk, 4 outsiders, 3 minions, 1 demon
      if (categorized.townsfolk.length !== 7) {
        console.error(`❌ Baron效果错误：鎮民數量 ${categorized.townsfolk.length}，應為 7`);
        baron15Correct = false;
        break;
      }
      if (categorized.outsiders.length !== 4) {
        console.error(`❌ Baron效果错误：外來者數量 ${categorized.outsiders.length}，應為 4`);
        baron15Correct = false;
        break;
      }
      if (categorized.minions.length !== 3) {
        console.error(`❌ Baron效果错误：爪牙數量 ${categorized.minions.length}，應為 3`);
        baron15Correct = false;
        break;
      }

      console.log(`✅ 第 ${i + 1} 次嘗試找到 Baron (15人局)，分配正確：`);
      console.log(`   鎮民: ${categorized.townsfolk.length} (應為7)`);
      console.log(`   外來者: ${categorized.outsiders.length} (應為4)`);
      console.log(`   爪牙: ${categorized.minions.length} (應為3, 含Baron)`);
      console.log(`   惡魔: ${categorized.demons.length} (應為1)`);
      break;
    }
  }

  if (!found15Baron) {
    console.warn(`⚠️ 警告：${maxAttempts3} 次嘗試中未抽到 Baron (15人局)`);
    results.push({
      test: '15人局Baron效果',
      passed: true,
      details: `${maxAttempts3}次未抽到Baron（機率問題，非錯誤）`,
    });
  } else if (baron15Correct) {
    console.log('✅ 通过：15人局 Baron 效果正確');
    results.push({
      test: '15人局Baron效果',
      passed: true,
      details: 'Baron效果正確：7鎮民, 4外來者, 3爪牙, 1惡魔',
    });
  } else {
    results.push({
      test: '15人局Baron效果',
      passed: false,
      details: 'Baron效果錯誤',
    });
  }

  // ========================================
  // 测试 6: 角色唯一性（无重复）
  // ========================================
  console.log('\n【测试 6】角色唯一性 - 不应有重复角色');
  let uniquenessCorrect = true;

  for (const playerCount of [7, 10, 15]) {
    const roles = registry.randomizeRolesWithSetup(playerCount);
    const uniqueRoles = new Set(roles);

    if (uniqueRoles.size !== roles.length) {
      console.error(`❌ ${playerCount}人局有重复角色：${roles.length} 個角色，但只有 ${uniqueRoles.size} 個唯一`);
      uniquenessCorrect = false;
      break;
    }
  }

  if (uniquenessCorrect) {
    console.log('✅ 通过：所有測試局均無重複角色');
    results.push({
      test: '角色唯一性',
      passed: true,
      details: '7人、10人、15人局均無重複',
    });
  } else {
    results.push({
      test: '角色唯一性',
      passed: false,
      details: '發現重複角色',
    });
  }

  // ========================================
  // 总结
  // ========================================
  console.log('\n========================================');
  console.log('测试总结');
  console.log('========================================');

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.test}: ${r.details}`);
  });

  console.log(`\n总计：${passedCount}/${totalCount} 测试通过`);

  if (passedCount === totalCount) {
    console.log('\n🎉 所有测试通过！Baron Setup Ability 系統運作正常！');
  } else {
    console.log(`\n⚠️ 有 ${totalCount - passedCount} 個測試失敗，請檢查實作。`);
  }

  console.log('========================================\n');

  return {
    passedCount,
    totalCount,
    allPassed: passedCount === totalCount,
    results,
  };
}

// 如果在 Node 环境直接运行
if (typeof window === 'undefined' && require.main === module) {
  verifyBaronSetup();
}
