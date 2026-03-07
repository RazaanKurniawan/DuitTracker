<template>
  <div class="custom-tag-input" :class="{ 'is-focused': isFocused }" @click="focusInput">
    <div class="tags-container">
      <span v-for="(tag, index) in modelValue" :key="index" class="tag">
        {{ tag }}
        <button type="button" class="remove-btn" @click.stop="removeTag(index)">×</button>
      </span>
      <input
        v-model="inputValue"
        type="text"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        @keydown.enter.prevent="addTag"
        @keydown.delete="handleBackspace"
        @focus="isFocused = true"
        @blur="handleBlur"
        ref="tagInput"
        class="tag-input"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomTagInput',
  props: {
    modelValue: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: 'Ketik lalu Enter (Multiple)'
    }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      inputValue: '',
      isFocused: false
    };
  },
  methods: {
    focusInput() {
      this.$refs.tagInput.focus();
    },
    handleBlur() {
      this.isFocused = false;
      this.addTag(); // Add any pending text as a tag on blur
    },
    addTag() {
      const val = this.inputValue.trim();
      if (val && !this.modelValue.includes(val)) {
        const newTags = [...this.modelValue, val];
        this.$emit('update:modelValue', newTags);
        this.$emit('change', newTags);
      }
      this.inputValue = '';
    },
    removeTag(index) {
      const newTags = [...this.modelValue];
      newTags.splice(index, 1);
      this.$emit('update:modelValue', newTags);
      this.$emit('change', newTags);
    },
    handleBackspace() {
      if (this.inputValue === '' && this.modelValue.length > 0) {
        this.removeTag(this.modelValue.length - 1);
      }
    }
  }
};
</script>

<style scoped>
.custom-tag-input {
  width: 100%;
  min-height: 44px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  cursor: text;
  transition: var(--transition);
}

.custom-tag-input.is-focused,
.custom-tag-input:hover {
  border-color: var(--accent-blue);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(67, 97, 238, 0.15);
  color: #a0b2ff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(67, 97, 238, 0.3);
}

.remove-btn {
  background: none;
  border: none;
  color: #a0b2ff;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  opacity: 0.6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  opacity: 1;
  color: #fff;
}

.tag-input {
  flex: 1;
  min-width: 120px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  padding: 6px 4px;
  outline: none;
}

.tag-input::placeholder {
  color: var(--text-muted);
}
</style>
