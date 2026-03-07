<template>
  <teleport to="body">
    <transition name="m-modal-fade">
      <div v-if="modelValue" class="m-modal-overlay" @click.self="close">
        <transition name="m-modal-slide">
          <div v-if="modelValue" class="m-modal-sheet">
            <div class="m-modal-handle"></div>
            <div class="m-modal-header">
              <h3>{{ title }}</h3>
              <button class="m-modal-close" @click="close">✕</button>
            </div>
            <div class="m-modal-body">
              <slot />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: 'MobileModal',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  methods: {
    close() {
      this.$emit('update:modelValue', false);
    },
  },
};
</script>

<style scoped>
/* Modal base styles are in mobile.css (shared with MobileSelect, MobileMonthPicker) */
</style>
