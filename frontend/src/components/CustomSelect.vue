<template>
  <div class="custom-select" :class="{ 'is-open': isOpen, 'open-up': openUp }" ref="dropdownRef">
    <div class="select-trigger" @click="toggleDropdown">
      <span class="selected-label">
        <template v-if="selectedOption">
          {{ selectedOption.label }}
        </template>
        <span v-else class="placeholder">{{ placeholder }}</span>
      </span>
      <span class="chevron">▼</span>
    </div>

    <Transition name="dropdown-fade">
      <ul v-show="isOpen" class="select-options">
        <li 
          v-for="option in normalizedOptions" 
          :key="option.value" 
          class="option" 
          :class="{ selected: option.value === modelValue }"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script>
export default {
  name: 'CustomSelect',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    options: {
      type: Array,
      required: true,
      // Array bisa berisi object {label, value} ATAU primitive types (string/number)
    },
    placeholder: {
      type: String,
      default: 'Pilih opsi'
    }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      isOpen: false,
      openUp: false,
    };
  },
  computed: {
    normalizedOptions() {
      return this.options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return { label: opt.label || opt.nama, value: opt.value !== undefined ? opt.value : opt.id };
        }
        return { label: opt, value: opt };
      });
    },
    selectedOption() {
      return this.normalizedOptions.find(opt => opt.value === this.modelValue);
    }
  },
  methods: {
    toggleDropdown() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.$nextTick(() => {
          const rect = this.$refs.dropdownRef.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          this.openUp = spaceBelow < 280;
        });
      }
    },
    selectOption(option) {
      this.$emit('update:modelValue', option.value);
      this.$emit('change', option.value);
      this.isOpen = false;
    },
    handleClickOutside(e) {
      if (this.$refs.dropdownRef && !this.$refs.dropdownRef.contains(e.target)) {
        this.isOpen = false;
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
  },
  unmounted() {
    document.removeEventListener('click', this.handleClickOutside);
  }
};
</script>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
}

.custom-select.is-open .select-trigger,
.select-trigger:hover {
  border-color: var(--accent-blue);
}

.custom-select.is-open .chevron {
  transform: rotate(180deg);
}

.placeholder {
  color: var(--text-muted);
}

.chevron {
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.3s ease;
}

.select-options {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  max-height: 260px;
  overflow-y: auto;
  z-index: 2000;
  list-style: none;
  padding: 6px;
  margin: 0;
}

.open-up .select-options {
  top: auto;
  bottom: calc(100% + 6px);
}

/* Custom Scrollbar */
.select-options::-webkit-scrollbar {
  width: 6px;
}
.select-options::-webkit-scrollbar-track {
  background: transparent;
}
.select-options::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}
.select-options::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

.option {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.option:hover {
  background: rgba(67, 97, 238, 0.1);
  color: var(--text-primary);
}

.option.selected {
  background: var(--accent-blue);
  color: #fff;
  font-weight: 500;
}

/* Transitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
