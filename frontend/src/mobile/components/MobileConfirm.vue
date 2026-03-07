<template>
  <teleport to="body">
    <transition name="m-modal-fade">
      <div v-if="modelValue" class="m-modal-overlay" @click.self="cancel">
        <transition name="m-modal-slide">
          <div v-if="modelValue" class="m-modal-sheet m-confirm-sheet">
            <div class="m-modal-handle"></div>
            <div class="m-confirm-icon">⚠️</div>
            <h3 class="m-confirm-title">{{ title }}</h3>
            <p class="m-confirm-msg">{{ message }}</p>
            <div class="m-confirm-actions">
              <button class="m-btn m-btn-secondary m-confirm-btn" @click="cancel">Batal</button>
              <button class="m-btn m-btn-danger m-confirm-btn" @click="ok">{{ confirmText }}</button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: 'MobileConfirm',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: 'Konfirmasi' },
    message: { type: String, default: 'Apakah Anda yakin?' },
    confirmText: { type: String, default: 'Hapus' },
  },
  emits: ['update:modelValue', 'confirm'],
  methods: {
    cancel() {
      this.$emit('update:modelValue', false);
    },
    ok() {
      this.$emit('update:modelValue', false);
      this.$emit('confirm');
    },
  },
};
</script>

<style scoped>
.m-confirm-sheet {
  padding: 20px 20px 24px !important;
  text-align: center;
}
.m-confirm-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.m-confirm-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.m-confirm-msg {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}
.m-confirm-actions {
  display: flex;
  gap: 12px;
}
.m-confirm-btn {
  flex: 1;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
}
</style>
