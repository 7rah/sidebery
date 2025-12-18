<template lang="pug">
section(ref="el")
  h2 {{translate('settings.omnibox_title')}}
  span.header-shadow
  InfoField.-no-separator(label="settings.omnibox_desc" :value="translate('settings.omnibox_note')")
  InfoField.-no-separator(label="settings.omnibox_cmds")
  .sub-fields.-nosep
    ToggleField(
      label="settings.omni_reopen_in_ctr"
      v-model:value="Settings.state.omniReopenInCtr"
      @update:value="Settings.saveDebounced(150)")
    .sub-fields.-nosep
      TextField.-inline(
        label="settings.omni_cmd_prefix"
        :or="''"
        :line="true"
        v-model:value="Settings.state.omniReopenInCtrPrefix"
        @update:value="Settings.saveDebounced(150)")
    ToggleField(
      label="settings.omni_switch_to_panel"
      v-model:value="Settings.state.omniSwitchToPanel"
      @update:value="Settings.saveDebounced(150)")
    .sub-fields.-nosep
      TextField.-inline(
        label="settings.omni_cmd_prefix"
        :or="''"
        :line="true"
        v-model:value="Settings.state.omniSwitchToPanelPrefix"
        @update:value="Settings.saveDebounced(150)")
    ToggleField(
      label="settings.omni_move_to_panel"
      v-model:value="Settings.state.omniMoveToPanel"
      @update:value="Settings.saveDebounced(150)")
    .sub-fields.-nosep
      TextField.-inline(
        label="settings.omni_cmd_prefix"
        :or="''"
        :line="true"
        v-model:value="Settings.state.omniMoveToPanelPrefix"
        @update:value="Settings.saveDebounced(150)")
    ToggleField(
      label="settings.omni_move_to_group"
      v-model:value="Settings.state.omniMoveToGroup"
      @update:value="Settings.saveDebounced(150)")
    .sub-fields.-nosep
      TextField.-inline(
        label="settings.omni_cmd_prefix"
        :or="''"
        :line="true"
        v-model:value="Settings.state.omniMoveToGroupPrefix"
        @update:value="Settings.saveDebounced(150)")
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { translate } from 'src/dict'
import * as Settings from 'src/services/settings.fg'
import * as SetupPage from 'src/services/setup-page.fg'
import TextField from '../../components/text-field.vue'
import ToggleField from '../../components/toggle-field.vue'
import InfoField from '../../components/info-field.vue'

const el = ref<HTMLElement | null>(null)

onMounted(() => SetupPage.registerEl('settings_omnibox', el.value))
</script>
