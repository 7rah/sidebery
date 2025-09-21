<template lang="pug">
.SessionRestore.popup-container
  .popup(@click.stop)
    h2 Session Restore
    LoadingDots.loading-dots
    .msg Sidebery is reinitializing tabs for restored session, please wait...
</template>

<script lang="ts" setup>
import LoadingDots from 'src/components/loading-dots.vue'
</script>
