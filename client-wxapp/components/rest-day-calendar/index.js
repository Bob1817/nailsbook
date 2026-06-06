Component({
  properties: {
    show: { type: Boolean, value: false },
    value: { type: Array, value: [] }
  },

  data: {
    year: 0,
    month: 0,
    days: [],
    selected: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六']
  },

  observers: {
    show: function (val) {
      if (val) {
        var now = new Date();
        this._todayStr = this._fmt(now);
        this.setData({
          year: now.getFullYear(),
          month: now.getMonth(),
          selected: (this.data.value || []).slice()
        });
        this._build();
      }
    }
  },

  methods: {
    _fmt: function (d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },

    _build: function () {
      var year = this.data.year;
      var month = this.data.month;
      var selected = this.data.selected;
      var todayStr = this._todayStr;

      var firstDay = new Date(year, month, 1);
      var lastDay = new Date(year, month + 1, 0);
      var daysInMonth = lastDay.getDate();
      var startDow = firstDay.getDay();

      var days = [];
      // 填充上月空白
      for (var i = 0; i < startDow; i++) {
        days.push({ day: '', dateStr: '', isCurrentMonth: false, isPast: true, isSelected: false });
      }
      // 本月日期
      for (var d = 1; d <= daysInMonth; d++) {
        var date = new Date(year, month, d);
        var dateStr = this._fmt(date);
        var isPast = dateStr < todayStr;
        days.push({
          day: d,
          dateStr: dateStr,
          isCurrentMonth: true,
          isPast: isPast,
          isSelected: selected.indexOf(dateStr) >= 0
        });
      }
      this.setData({ days: days });
    },

    prevMonth: function () {
      var y = this.data.year;
      var m = this.data.month - 1;
      if (m < 0) { m = 11; y--; }
      this.setData({ year: y, month: m });
      this._build();
    },

    nextMonth: function () {
      var y = this.data.year;
      var m = this.data.month + 1;
      if (m > 11) { m = 0; y++; }
      this.setData({ year: y, month: m });
      this._build();
    },

    onDayTap: function (e) {
      var dateStr = e.currentTarget.dataset.date;
      var isPast = e.currentTarget.dataset.past;
      if (!dateStr || isPast) return;

      var selected = this.data.selected.slice();
      var idx = selected.indexOf(dateStr);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else {
        selected.push(dateStr);
      }
      this.setData({ selected: selected });
      this._build();
    },

    onConfirm: function () {
      this.triggerEvent('confirm', { dates: this.data.selected.slice() });
    },

    onClose: function () {
      this.triggerEvent('close');
    },

    preventScroll: function () {}
  }
});
