<template>
  <div class="ms-wrapper">
    <div class="ms-trigger m-select" :class="{ 'ms-placeholder': !selectedLabel }" @click="open = true">
      {{ selectedLabel || placeholder }}
    </div>
    <teleport to="body">
      <transition name="m-modal-fade">
        <div v-if="open" class="m-modal-overlay" @click.self="open = false">
          <transition name="m-modal-slide">
            <div v-if="open" class="m-modal-sheet">
              <div class="m-modal-handle"></div>
              <div class="m-modal-header">
                <h3>{{ label }}</h3>
                <button class="m-modal-close" @click="open = false">✕</button>
              </div>
              <div class="ms-options">
                <div
                  v-for="opt in options"
                  :key="opt.value"
                  class="ms-option"
                  :class="{ active: modelValue == opt.value, disabled: opt.disabled }"
                  @click="select(opt)"
                >
                  <span class="ms-option-label">{{ opt.label }}</span>
                  <span v-if="modelValue == opt.value" class="ms-check">✓</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script>
export default {
  name: 'MobileSelect',
  props: {
    modelValue: { default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '-- Pilih --' },
    label: { type: String, default: 'Pilih' },
  },
  emits: ['update:modelValue'],
  data() {
    return { open: false };
  },
  computed: {
    selectedLabel() {
      const found = this.options.find(o => o.value == this.modelValue);
      return found ? found.label : '';
    },
  },
  methods: {
    select(opt) {
      if (opt.disabled) return;
      this.$emit('update:modelValue', opt.value);
      this.open = false;
    },
  },
};
</script>

<style scoped>
.ms-wrapper {
  position: relative;
}
.ms-trigger {
  cursor: pointer;
  user-select: none;
}
.ms-placeholder {
  color: var(--text-secondary);
}
.ms-options {
  max-height: 50vh;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.ms-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 15px;
  color: var(--text-primary);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.ms-option:active {
  background: var(--bg-input);
}
.ms-option.active {
  background: rgba(67, 97, 238, 0.12);
  color: var(--accent-blue);
  font-weight: 600;
}
.ms-option.disabled {
  opacity: 0.4;
  pointer-events: none;
}
.ms-check {
  font-weight: 700;
  color: var(--accent-blue);
  font-size: 18px;
}
</style>
