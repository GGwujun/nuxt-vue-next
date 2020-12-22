<template>
  <div>
    <h1>应用运行异常</h1>
  </div>
</template>

<script>
export default {
  props: {
    error: {
      default: () => ({}),
      type: Object,
    },
  },
};
</script>
