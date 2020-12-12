import { SET_USER_DATA } from "./mutation-type";

export default {
  state() {
    return {
      // 第一次进入银河系统
      isVirgin: false,
      // 用户设置
      settings: {},
    };
  },

  mutations: {},

  actions: {
    // 初始化用户信息
    async init({ commit }) {
      commit(SET_USER_DATA, {
        key: "settings",
        value: {},
      });
      commit(SET_USER_DATA, {
        key: "isVirgin",
        value: true,
      });
    },
  },
};
