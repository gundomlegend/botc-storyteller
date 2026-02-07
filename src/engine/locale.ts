import type { RoleData } from './types';

export type Locale = 'en' | 'zh-TW';

let currentLocale: Locale = 'zh-TW';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

type LocalizableField = 'name' | 'ability' | 'firstNightReminder' | 'otherNightReminder';

const cnFieldMap: Record<LocalizableField, keyof RoleData> = {
  name: 'name_cn',
  ability: 'ability_cn',
  firstNightReminder: 'firstNightReminder_cn',
  otherNightReminder: 'otherNightReminder_cn',
};

/**
 * 根據當前語系取得 RoleData 的對應欄位值。
 * 若中文欄位為空則 fallback 到英文。
 */
export function t(roleData: RoleData, field: LocalizableField): string {
  if (currentLocale === 'zh-TW') {
    const cnValue = roleData[cnFieldMap[field]] as string;
    if (cnValue) return cnValue;
  }
  return roleData[field] as string;
}
