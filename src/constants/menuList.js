// src/constants/menuList.js
import { MENU_LIST_DLI } from './menuListDLI';
import { MENU_LIST_DBS } from './menuListDBS';

/**
 * Mengambil susunan menu aktif berdasarkan identitas corporate
 * Standar PT:
 * A -> DBS (Dakota Buana Sarana)
 * B -> DLB (Dakota Lintas Buana)
 * C -> DLI (Dakota Logistik Indonesia)
 */
export const getActiveMenuList = () => {
  const ptId = (
    localStorage.getItem('selected_pt') ||
    localStorage.getItem('pt_id') ||
    'C'
  ).toUpperCase();

  const activeCorp = (
    localStorage.getItem('active_corporate') ||
    'DLI'
  ).toUpperCase();

  // Mode DBS (PT A)
  if (ptId === 'A' || activeCorp === 'DBS') {
    return MENU_LIST_DBS;
  }

  // Mode DLB (PT B) - sementara arahkan ke DBS atau buat menuListDLB tersendiri nantinya
  if (ptId === 'B' || activeCorp === 'DLB') {
    return MENU_LIST_DBS;
  }

  // Mode DLI (PT C) - Default
  return MENU_LIST_DLI;
};

// Fallback jika ada komponen lama yang mengimpor langsung MENU_LIST
export const MENU_LIST = getActiveMenuList();