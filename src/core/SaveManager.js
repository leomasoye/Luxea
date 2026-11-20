/**
 * SaveManager.js — Sauvegarde locale légère (localStorage).
 * Conforme à AGENT.md : Sauvegarde discrète de l'état de jeu sans perturber l'expérience.
 */
export class SaveManager {
  static STORAGE_KEY = 'luxea_save_data_v1';

  static load() {
    try {
      const data = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Échec lecture sauvegarde locale:", e);
    }
    return SaveManager.getDefaults();
  }

  static save(state) {
    try {
      const data = {
        simpleKey: !!state.simpleKey,
        bossKey: !!state.bossKey,
        westGateOpen: !!state.westGateOpen,
        northGateOpen: !!state.northGateOpen,
        savedAt: Date.now()
      };
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Échec écriture sauvegarde locale:", e);
    }
  }

  static reset() {
    try {
      localStorage.removeItem(SaveManager.STORAGE_KEY);
    } catch (e) {
      // Ignorer
    }
    return SaveManager.getDefaults();
  }

  static getDefaults() {
    return {
      simpleKey: false,
      bossKey: false,
      westGateOpen: false,
      northGateOpen: false
    };
  }
}
