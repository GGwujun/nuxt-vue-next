import { h, resolveComponent } from "vue";

export default {
  render() {
    return h("div", { id: "nuxt_div" }, [h(resolveComponent("Nuxt"))]);
  },
  beforeCreate() {
    this.nuxt = this.$root.$options.nuxt;
  },
  created() {
    this.$root.$options.nuxt = this;
    if (process.client) {
      window.nuxt = window.$nuxt = this;
    }
    this.error = this.nuxt.error;
    this.context = this.nuxt.context;
  },
  watch: {
    "nuxt.err": "errorChanged",
  },
};
