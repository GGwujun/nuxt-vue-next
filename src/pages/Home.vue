<template>
  <NuxtLink to="/user">Home page goto User Page</NuxtLink>
  <img alt="Vue logo" src="../assets/logo.png" />
  <HelloWorld msg="Welcome to Your Vue.js App" />
</template>

<script>
import HelloWorld from "../view/HelloWorld.vue";

export default {
  name: "App",
  components: {
    HelloWorld,
  },
  data() {
    return {
      name: "home",
    };
  },
  created() {
    console.log("home this =====");
  },
};
</script>