<template>
  <div>
    <div class="m-month-filter">
      <button @click="prev">‹</button>
      <span class="mp-label" @click="showPicker = true">{{ label }}</span>
      <button @click="next">›</button>
    </div>
    <teleport to="body">
      <transition name="m-modal-fade">
        <div v-if="showPicker" class="m-modal-overlay" @click.self="showPicker = false">
          <transition name="m-modal-slide">
            <div v-if="showPicker" class="m-modal-sheet">
              <div class="m-modal-handle"></div>
              <div class="m-modal-header">
                <h3>Pilih Bulan &amp; Tahun</h3>
                <button class="m-modal-close" @click="showPicker = false">✕</button>
              </div>
              <div class="mp-year-nav">
                <button @click="pickerYear--" class="mp-year-btn">‹</button>
                <span class="mp-year-label">{{ pickerYear }}</span>
                <button @click="pickerYear++" class="mp-year-btn">›</button>
              </div>
              <div class="mp-grid">
                <div
                  v-for="(name, idx) in monthNames"
                  :key="idx"
                  class="mp-cell"
                  :class="{ active: month === idx + 1 && year === pickerYear }"
                  @click="selectMonth(idx + 1)"
                >{{ name }}</div>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script>
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default {
  name: 'MobileMonthPicker',
  props: {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  emits: ['update:month', 'update:year', 'change'],
  data() {
    return {
      showPicker: false,
      pickerYear: this.year,
      monthNames: MONTH_NAMES,
    };
  },
  computed: {
    label() {
      return MONTH_FULL[this.month - 1] + ' ' + this.year;
    },
  },
  watch: {
    year(val) {
      this.pickerYear = val;
    },
  },
  methods: {
    prev() {
      if (this.month === 1) {
        this.$emit('update:month', 12);
        this.$emit('update:year', this.year - 1);
      } else {
        this.$emit('update:month', this.month - 1);
      }
      this.$nextTick(() => this.$emit('change'));
    },
    next() {
      if (this.month === 12) {
        this.$emit('update:month', 1);
        this.$emit('update:year', this.year + 1);
      } else {
        this.$emit('update:month', this.month + 1);
      }
      this.$nextTick(() => this.$emit('change'));
    },
    selectMonth(m) {
      this.$emit('update:month', m);
      this.$emit('update:year', this.pickerYear);
      this.showPicker = false;
      this.$nextTick(() => this.$emit('change'));
    },
  },
};
</script>

<style scoped>
.mp-label {
  cursor: pointer;
  border-bottom: 1px dashed var(--text-secondary);
  padding-bottom: 2px;
}
.mp-year-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}
.mp-year-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mp-year-label {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 80px;
  text-align: center;
}
.mp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.mp-cell {
  padding: 14px 8px;
  text-align: center;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.15s;
}
.mp-cell:active {
  transform: scale(0.95);
}
.mp-cell.active {
  background: var(--accent-gradient);
  color: white;
  border-color: transparent;
  font-weight: 700;
}
</style>
