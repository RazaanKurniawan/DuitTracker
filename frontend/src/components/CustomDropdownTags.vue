<template>
  <div class="custom-dropdown-tags" ref="dropdownRef">
    <!-- Trigger Area (Acts like an input but shows tags) -->
    <div 
      class="tags-trigger" 
      :class="{ 'is-focused': isOpen }" 
      @click="toggleDropdown"
    >
      <div class="tags-container">
        <!-- Selected Tags -->
        <span v-for="tagValue in modelValue" :key="tagValue" class="tag">
          {{ getLabel(tagValue) }}
          <button type="button" class="remove-btn" @click.stop="removeTag(tagValue)">×</button>
        </span>
        
        <!-- Placeholder if empty -->
        <span v-if="modelValue.length === 0" class="placeholder">{{ placeholder }}</span>
      </div>
      <span class="chevron" :class="{ open: isOpen }">▼</span>
    </div>

    <!-- Dropdown Options -->
    <Transition name="dropdown-fade">
      <ul v-show="isOpen" class="select-options">
        <li 
          v-for="option in normalizedOptions" 
          :key="option.value" 
          class="option" 
          :class="{ selected: modelValue.includes(option.value) }"
          @click.stop="toggleOption(option)"
        >
          <div class="checkbox-box" :class="{ checked: modelValue.includes(option.value) }">
            <span v-if="modelValue.includes(option.value)">✓</span>
          </div>
          {{ option.label }}
        </li>
        <li v-if="normalizedOptions.length === 0" class="empty-option">Tidak ada pilihan</li>
      </ul>
    </Transition>
  </div>
</template>

<script>
export default {
  name: 'CustomDropdownTags',
  props: {
    modelValue: {
      type: Array,
      default: () => []
    },
    options: {
      type: Array,
      required: true
    },
    placeholder: {
      type: String,
      default: 'Pilih opsi...'
    }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      isOpen: false
    };
  },
  computed: {
    normalizedOptions() {
      return this.options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return { label: opt.label || opt.nama, value: opt.value !== undefined ? opt.value : opt.id };
        }
        return { label: String(opt), value: String(opt) };
      });
    }
  },
  methods: {
    toggleDropdown() {
      this.isOpen = !this.isOpen;
    },
    getLabel(value) {
      const option = this.normalizedOptions.find(opt => opt.value === value);
      return option ? option.label : value;
    },
    toggleOption(option) {
      const newValue = [...this.modelValue];
      const index = newValue.indexOf(option.value);
      
      if (index === -1) {
        newValue.push(option.value); // Select
      } else {
        newValue.splice(index, 1); // Deselect
      }
      
      this.$emit('update:modelValue', newValue);
      this.$emit('change', newValue);
    },
    removeTag(value) {
      const newValue = this.modelValue.filter(v => v !== value);
      this.$emit('update:modelValue', newValue);
      this.$emit('change', newValue);
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
.custom-dropdown-tags {
  position: relative;
  width: 100%;
}

.tags-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 4px 12px 4px 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
}

.tags-trigger.is-focused,
.tags-trigger:hover {
  border-color: var(--accent-blue);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 4px;
}

.placeholder {
  color: var(--text-muted);
  font-size: 14px;
  padding-left: 6px;
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

.chevron {
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.3s ease;
  margin-left: 8px;
}

.chevron.open {
  transform: rotate(180deg);
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

/* Custom Scrollbar */
.select-options::-webkit-scrollbar { width: 6px; }
.select-options::-webkit-scrollbar-track { background: transparent; }
.select-options::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
.select-options::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

.option {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.option:hover {
  background: rgba(67, 97, 238, 0.1);
  color: var(--text-primary);
}

.checkbox-box {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.checkbox-box.checked {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
}

.empty-option {
  padding: 14px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
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
