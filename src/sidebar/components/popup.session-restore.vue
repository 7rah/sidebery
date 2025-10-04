<template lang="pug">
.SessionRestore.popup-container
  .popup(@click.stop)
    h2 {{translate('popup.ses_res.title')}}
    LoadingDots.loading-dots
    .msg {{translate('popup.ses_res.desc')}}
</template>

<script lang="ts" setup>
import LoadingDots from 'src/components/loading-dots.vue'
import { translate } from 'src/dict'
</script>
