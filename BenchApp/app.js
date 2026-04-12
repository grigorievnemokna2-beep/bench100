// ============================================================
// BENCH 100 — Главная логика приложения
// ============================================================
// Все данные хранятся в localStorage телефона.
// Даже без интернета приложение работает.
// ============================================================

const App = {
  // Текущее состояние навигации
  currentCycleId: null,
  currentWeek: null,
  currentDay: null,
  currentExIndex: null,

  // Таймер
  timerInterval: null,
  timerSeconds: 0,
  timerRunning: false,
  timerTarget: 0,
  timerEndAt: null,  // timestamp когда таймер закончится

  // Модальное окно
  modalCallback: null,

  // Графики
  _chartId: 0,

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  // Expanded weeks tracking for collapse feature
  _expandedWeeks: {},

  init() {
    this.loadData();
    this.showCycles();
    this.initModalKeys();
    this.initSwipeGestures();

    // Запрашиваем разрешение на уведомления (для таймера на экране блокировки)
    if ('Notification' in window && Notification.permission === 'default') {
      document.addEventListener('click', function reqPerm() {
        Notification.requestPermission();
        document.removeEventListener('click', reqPerm);
      }, { once: true });
    }

    // Восстановление таймера при возврате в приложение
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.timerRunning && this.timerEndAt) {
        const remaining = Math.ceil((this.timerEndAt - Date.now()) / 1000);
        if (remaining <= 0) {
          this.timerSeconds = 0;
          clearInterval(this.timerInterval);
          this.timerRunning = false;
          this.timerEndAt = null;
          this.updateTimerDisplay();
          this.timerFinished();
        } else {
          this.timerSeconds = remaining;
          this.updateTimerDisplay();
        }
      }
    });
  },

  // ==================== ДАННЫЕ ====================
  // Загрузка данных из localStorage
  loadData() {
    const raw = localStorage.getItem('bench100_data');
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch (e) {
        this.data = { cycles: [], barWeight: 20, version: 1 };
      }
    } else {
      this.data = { cycles: [], barWeight: 20, version: 1 };
    }
    if (this.data.barWeight === undefined) this.data.barWeight = 20;
    if (!this.data.trainingDays) this.data.trainingDays = ['Пн', 'Ср', 'Пт'];
    if (!this.data.weightStep) this.data.weightStep = 0.5;
    this.migrateData();
  },

  migrateData() {
    const v = this.data.version || 0;
    if (v < 1) {
      if (this.data.cycles) {
        this.data.cycles.forEach(c => {
          if (!c.id) c.id = Date.now().toString();
          if (!c.workouts) c.workouts = {};
          if (!c.maxWeight) c.maxWeight = 0;
          if (!c.name) c.name = 'Проходка';
        });
      }
      this.data.version = 1;
      this.saveData();
    }
  },

  // Сохранение данных в localStorage
  saveData() {
    localStorage.setItem('bench100_data', JSON.stringify(this.data));
  },

  // ==================== БЭКАП ====================
  exportData() {
    const json = JSON.stringify(this.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `bench100_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData() {
    document.getElementById('import-file').click();
  },

  handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported.cycles || !Array.isArray(imported.cycles)) {
          this.showToast('Неверный формат файла');
          return;
        }
        const valid = imported.cycles.every(c =>
          c && typeof c === 'object' && c.id && typeof c.maxWeight === 'number' && c.maxWeight > 0
        );
        if (!valid) {
          this.showToast('Файл содержит повреждённые данные');
          return;
        }
        if (!confirm(`Восстановить данные? (${imported.cycles.length} проходок)\nТекущие данные будут заменены.`)) return;
        this.data = imported;
        this.migrateData();
        this.saveData();
        this.showCycles();
        this.showToast('Данные восстановлены!');
      } catch (err) {
        this.showToast('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  // ==================== ВЕС НА СТОРОНУ ====================
  getPerSide(weight) {
    const bar = this.data.barWeight || 20;
    const perSide = (weight - bar) / 2;
    if (perSide <= 0) return null;
    return Math.round(perSide * 100) / 100;
  },

  editBarWeight() {
    const current = this.data.barWeight || 20;
    const val = prompt('Вес грифа (кг):', current);
    if (val === null) return;
    const w = parseFloat(val);
    if (!w || w <= 0) return;
    this.data.barWeight = w;
    this.saveData();
    if (this.currentExIndex !== null) this.renderSets();
    else this.showWeeks();
  },

  // ==================== НАВИГАЦИЯ ====================
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
    this.updateFloatingTimer();
  },

  goBack() {
    if (this.currentExIndex !== null) {
      this.showDay();
    } else if (this.currentWeek !== null && this.currentDay !== null) {
      this.showWeeks();
    } else if (this.currentCycleId !== null) {
      this.showCycles();
    } else {
      this.showCycles();
    }
  },

  // ==================== ЭКРАН: ПРОХОДКИ ====================
  showCycles() {
    this.currentCycleId = null;
    this.currentWeek = null;
    this.currentDay = null;
    this.currentExIndex = null;
    this.showScreen('cycles');
    this.renderCycles();
  },

  renderCycles() {
    const container = document.getElementById('cycles-list');

    if (this.data.cycles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#x1F3CB;</div>
          <h3>Пока нет проходок</h3>
          <p>Создай первую проходку, укажи свой максимум в жиме лёжа, и программа рассчитает все веса автоматически!</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Total tonnage across all cycles
    let grandTotalVolume = 0;
    this.data.cycles.forEach(c => { grandTotalVolume += this.getCycleTotalVolume(c); });
    if (grandTotalVolume > 0) {
      const volStr = grandTotalVolume > 9999 ? (grandTotalVolume / 1000).toFixed(1) + ' т' : grandTotalVolume + ' кг';
      html += `<div class="total-tonnage">Всего поднято: ${volStr}</div>`;
    }

    // Continue button for most recent cycle
    const lastCycle = this.data.cycles[this.data.cycles.length - 1];
    const next = this.getNextWorkout(lastCycle);
    if (next) {
      html += `
        <button class="btn-continue" onclick="App.openCycle('${lastCycle.id}'); App.openDay(${next.week}, '${next.day}')">
          <div>
            <div><span class="play-icon"></span> Продолжить: Неделя ${next.week}, ${next.day}</div>
            ${next.weekTitle ? `<div class="continue-sub">${next.weekTitle}</div>` : ''}
          </div>
        </button>
      `;
    }

    html += this.data.cycles.map(cycle => {
      const totalWorkouts = this.getTotalWorkouts();
      const completedWorkouts = this.getCompletedWorkouts(cycle);
      const progressPercent = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

      // Current week calculation
      let currentWeek = 9;
      for (const week of PROGRAM) {
        let weekDone = true;
        for (const day of week.days) {
          const wo = cycle.workouts ? cycle.workouts[`${week.week}-${day.day}`] : null;
          if (!wo || (!wo.completed && !wo.skipped)) { weekDone = false; break; }
        }
        if (!weekDone) { currentWeek = week.week; break; }
      }

      return `
        <div class="cycle-card-wrapper">
          <div class="swipe-actions">
            <button class="swipe-action-delete" onclick="event.stopPropagation(); App.deleteCycle('${cycle.id}')">Удалить</button>
          </div>
          <div class="cycle-card" data-cycle-id="${cycle.id}" onclick="App.openCycle('${cycle.id}')">
            <h3>${this.escapeHtml(cycle.name)}</h3>
            <div class="cycle-meta">
              <span class="cycle-max">Макс: ${cycle.maxWeight} кг</span>
              &nbsp;&middot;&nbsp;
              <span>${completedWorkouts}/${totalWorkouts} тренировок</span>
              &nbsp;&middot;&nbsp;
              <span>${progressPercent}%</span>
              &nbsp;&middot;&nbsp;
              <span>Неделя ${currentWeek} из 9</span>
            </div>
            <div class="cycle-progress-bar">
              <div class="cycle-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  getTotalWorkouts() {
    let total = 0;
    PROGRAM.forEach(week => { total += week.days.length; });
    return total;
  },

  getCompletedWorkouts(cycle) {
    if (!cycle.workouts) return 0;
    return Object.values(cycle.workouts).filter(w => w.completed).length;
  },

  getNextWorkout(cycle) {
    if (!cycle || !cycle.workouts) {
      return { week: 1, day: PROGRAM[0].days[0].day };
    }
    for (const week of PROGRAM) {
      for (const day of week.days) {
        const key = `${week.week}-${day.day}`;
        const wo = cycle.workouts[key];
        if (!wo || (!wo.completed && !wo.skipped)) {
          return { week: week.week, day: day.day, weekTitle: week.title };
        }
      }
    }
    return null;
  },

  skipWorkout(week, day) {
    const cycle = this.getCycle();
    const key = `${week}-${day}`;
    if (!cycle.workouts) cycle.workouts = {};
    if (!cycle.workouts[key]) {
      cycle.workouts[key] = { exercises: {}, date: new Date().toISOString(), completed: false };
    }
    const reason = prompt('Причина пропуска (необязательно):');
    if (reason === null) return;
    cycle.workouts[key].skipped = true;
    cycle.workouts[key].skipReason = reason || '';
    this.saveData();
    this.renderWeeks();
  },

  unskipWorkout(week, day) {
    const cycle = this.getCycle();
    const key = `${week}-${day}`;
    if (cycle.workouts && cycle.workouts[key]) {
      delete cycle.workouts[key].skipped;
      delete cycle.workouts[key].skipReason;
    }
    this.saveData();
    this.renderWeeks();
  },

  // ==================== СОЗДАНИЕ ПРОХОДКИ ====================
  showAddCycle() {
    this.showScreen('add-cycle');
    document.getElementById('cycle-name').value = `Проходка ${this.data.cycles.length + 1}`;
    // Auto-suggest max from last cycle
    const hint = document.getElementById('cycle-max-hint');
    if (this.data.cycles.length > 0) {
      const lastMax = this.data.cycles[this.data.cycles.length - 1].maxWeight;
      document.getElementById('cycle-max').value = lastMax + 2.5;
      hint.textContent = `Прошлая проходка: ${lastMax} кг (+2.5 кг)`;
    } else {
      document.getElementById('cycle-max').value = '';
      hint.textContent = 'Все веса в базовых упражнениях будут рассчитаны автоматически от этой цифры.';
    }
    document.getElementById('cycle-max').focus();
  },

  createCycle() {
    const name = document.getElementById('cycle-name').value.trim() || 'Проходка';
    const maxWeight = parseFloat(document.getElementById('cycle-max').value);

    if (!maxWeight || maxWeight <= 0) {
      this.showToast('Укажи свой максимум в жиме лёжа!');
      return;
    }

    const cycle = {
      id: Date.now().toString(),
      name: name,
      maxWeight: maxWeight,
      createdAt: new Date().toISOString(),
      workouts: {}
    };

    this.data.cycles.push(cycle);
    this.saveData();
    this.openCycle(cycle.id);
  },

  deleteCycle(id) {
    if (!confirm('Удалить эту проходку? Все данные тренировок будут потеряны.')) return;
    const deleted = this.data.cycles.find(c => c.id === id);
    this.data.cycles = this.data.cycles.filter(c => c.id !== id);
    this.saveData();
    this.renderCycles();
    if (deleted) {
      this._deletedCycle = deleted;
      clearTimeout(this._undoTimeout);
      this.showUndoToast();
    }
  },

  showUndoToast() {
    let toast = document.getElementById('undo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'undo-toast';
      toast.style.cssText = 'position:fixed;bottom:calc(90px + var(--safe-bottom));left:50%;transform:translateX(-50%);background:var(--surface2);color:var(--t1);padding:12px 20px;border-radius:var(--r-pill);font-size:14px;font-weight:600;z-index:200;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.5);border:1px solid var(--line);';
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span>Удалено</span><button onclick="App.undoDelete()" style="background:var(--accent);color:#000;border:none;padding:6px 16px;border-radius:var(--r-pill);font-size:13px;font-weight:700;cursor:pointer;">Отменить</button>';
    toast.style.display = 'flex';
    this._undoTimeout = setTimeout(() => {
      toast.style.display = 'none';
      this._deletedCycle = null;
    }, 5000);
  },

  undoDelete() {
    if (!this._deletedCycle) return;
    this.data.cycles.push(this._deletedCycle);
    this._deletedCycle = null;
    clearTimeout(this._undoTimeout);
    const toast = document.getElementById('undo-toast');
    if (toast) toast.style.display = 'none';
    this.saveData();
    this.renderCycles();
  },

  // ==================== ЭКРАН: НЕДЕЛИ ====================
  openCycle(id) {
    this.currentCycleId = id;
    this.showWeeks();
  },

  showWeeks() {
    this.currentWeek = null;
    this.currentDay = null;
    this.currentExIndex = null;
    this.showScreen('weeks');

    const cycle = this.getCycle();
    if (!cycle) return;

    document.getElementById('weeks-title').textContent = cycle.name;
    document.getElementById('max-badge').textContent = `Макс: ${cycle.maxWeight} кг`;
    document.getElementById('bar-badge').textContent = `Гриф: ${this.data.barWeight || 20} кг`;
    this.renderWeeks();
  },

  getCycle() {
    return this.data.cycles.find(c => c.id === this.currentCycleId);
  },

  renderWeeks() {
    const container = document.getElementById('weeks-list');
    const cycle = this.getCycle();

    // Today detection
    const todayIdx = new Date().getDay(); // 0=Sun, 1=Mon...
    const dayMap = { 'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6, 'Вс': 0 };
    const trainingDays = this.data.trainingDays || ['Пн', 'Ср', 'Пт'];

    container.innerHTML = PROGRAM.map(week => {
      // Check if all days completed/skipped
      const allDone = week.days.every(day => {
        const wo = cycle.workouts ? cycle.workouts[`${week.week}-${day.day}`] : null;
        return wo && (wo.completed || wo.skipped);
      });
      const isCollapsed = allDone && !this._expandedWeeks[week.week];

      const daysHtml = week.days.map((day, di) => {
        const key = `${week.week}-${day.day}`;
        const workout = cycle.workouts ? cycle.workouts[key] : null;
        const completed = workout && workout.completed;
        const skipped = workout && workout.skipped;
        const cls = completed ? 'completed' : (skipped ? 'skipped' : '');
        // Today highlight: match training day to real weekday
        const mappedDay = trainingDays[di] || day.day;
        const isToday = dayMap[mappedDay] === todayIdx && !completed && !skipped;
        const todayCls = isToday ? ' today' : '';
        const label = completed ? day.day + ' &#10003;' : (skipped ? day.day + ' &#10007;' : day.day);

        return `<div class="day-chip ${cls}${todayCls}" onclick="event.stopPropagation(); App.openDay(${week.week}, '${day.day}')">${label}</div>`;
      }).join('');

      // Volume preview
      let totalSets = 0, maxPercent = 0;
      week.days.forEach(day => {
        day.exercises.forEach(ex => {
          totalSets += this.getTotalSets(ex);
          if (ex.segments) ex.segments.forEach(s => { if (s.percent > maxPercent) maxPercent = s.percent; });
        });
      });

      if (isCollapsed) {
        return `<div class="week-card week-collapsed" onclick="App.expandWeek(${week.week})">
          <span class="week-number">Неделя ${week.week}</span>
          <span class="week-title">${week.title}</span>
          <span class="week-done-badge">${week.days.length}/${week.days.length}</span>
        </div>`;
      }

      return `
        <div class="week-card" ${allDone ? `onclick="App.expandWeek(${week.week})"` : ''}>
          <div class="week-header">
            <span class="week-number">Неделя ${week.week}</span>
            <span class="week-title">${week.title}</span>
          </div>
          <span class="week-meta">${totalSets} подх. · макс ${maxPercent}%</span>
          <div class="week-days">${daysHtml}</div>
        </div>
      `;
    }).join('');
  },

  // ==================== ИЗМЕНЕНИЕ МАКСИМУМА ====================
  editMax() {
    const cycle = this.getCycle();
    document.getElementById('modal-max-input').value = cycle.maxWeight;
    document.getElementById('modal-max').classList.remove('hidden');
  },

  saveNewMax() {
    const newMax = parseFloat(document.getElementById('modal-max-input').value);
    if (!newMax || newMax <= 0) return;

    const cycle = this.getCycle();
    cycle.maxWeight = newMax;
    this.saveData();

    document.getElementById('max-badge').textContent = `Макс: ${newMax} кг`;
    document.getElementById('modal-max').classList.add('hidden');
  },

  // ==================== ЭКРАН: ДЕНЬ ТРЕНИРОВКИ ====================
  openDay(week, day) {
    this.currentWeek = week;
    this.currentDay = day;
    this.currentExIndex = null;
    this.showDay();
  },

  showDay() {
    this.currentExIndex = null;
    this.showScreen('day');

    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    const workout = cycle.workouts ? cycle.workouts[workoutKey] : null;

    document.getElementById('day-title').textContent = `Неделя ${this.currentWeek} - ${this.currentDay}`;
    // Show/hide nav arrows
    const list = this._getDaysList();
    const dayIdx = list.findIndex(d => d.week === this.currentWeek && d.day === this.currentDay);
    document.getElementById('btn-prev-day').style.visibility = dayIdx > 0 ? 'visible' : 'hidden';
    document.getElementById('btn-next-day').style.visibility = dayIdx < list.length - 1 ? 'visible' : 'hidden';

    // Skip section
    const container = document.getElementById('exercises-list');
    let skipHtml = '';
    const isSkipped = workout && workout.skipped;
    const isCompleted = workout && workout.completed;

    if (isSkipped) {
      skipHtml += workout.skipReason
        ? `<div class="skip-reason">Пропущено: ${this.escapeHtml(workout.skipReason)}</div>`
        : `<div class="skip-reason">Тренировка пропущена</div>`;
      skipHtml += `<div class="skip-section"><button class="btn-unskip" onclick="App.unskipWorkout(${this.currentWeek}, '${this.currentDay}'); App.showDay()">Отменить пропуск</button></div>`;
    } else if (!isCompleted) {
      skipHtml += `<div class="skip-section"><button class="btn-skip" onclick="App.skipWorkout(${this.currentWeek}, '${this.currentDay}'); App.showWeeks()">&#10007; Пропустить тренировку</button></div>`;
    }

    this.renderExercises(dayData, workout, cycle.maxWeight, skipHtml);
  },

  renderExercises(dayData, workout, maxWeight, skipHtml = '') {
    const container = document.getElementById('exercises-list');

    // Day summary
    let totalEx = dayData.exercises.length;
    let doneEx = 0;
    let totalSetsAll = 0;
    let doneSetsAll = 0;
    dayData.exercises.forEach((ex, idx) => {
      const s = workout && workout.exercises ? workout.exercises[idx] : null;
      const ts = this.getTotalSets(ex);
      const ds = s ? (s.completedSets || 0) : 0;
      totalSetsAll += ts;
      doneSetsAll += ds;
      if (ds >= ts && ts > 0) doneEx++;
    });

    // Estimated workout duration
    let estMinutes = 0;
    dayData.exercises.forEach(ex => {
      if (ex.isSpecial) return;
      const sets = ex.segments && !ex.isIndividual
        ? ex.segments.reduce((sum, seg) => sum + seg.sets, 0)
        : (ex.sets || 0);
      if (ex.isBase) {
        estMinutes += sets * (4 + 1); // 4min rest + 1min per set
      } else {
        estMinutes += sets * (1.5 + 0.5); // 1.5min rest + 0.5min per set
      }
      if (ex.superset) {
        estMinutes += (ex.superset.sets || 0) * (1.5 + 0.5);
      }
    });

    // Session control (start/end workout)
    const isActive = workout && workout.startedAt && !workout.finishedAt;
    let sessionHtml = '';
    if (isActive) {
      const startMs = new Date(workout.startedAt).getTime();
      const elapsedMs = Date.now() - startMs;
      const elapsedMin = Math.floor(elapsedMs / 60000);
      const hrs = Math.floor(elapsedMin / 60);
      const mins = elapsedMin % 60;
      const elapsedStr = hrs > 0 ? `${hrs}ч ${mins}мин` : `${mins} мин`;
      sessionHtml = `<div class="day-summary-stat session-duration"><div class="day-summary-val">${elapsedStr}</div><div class="day-summary-label">в зале</div></div>`;
    }

    let html = '';

    // Workout start/end controls
    if (isActive) {
      html += `<div class="day-summary">
        <div class="day-summary-stat"><div class="day-summary-val">${doneEx}/${totalEx}</div><div class="day-summary-label">упражнений</div></div>
        <div class="day-summary-stat"><div class="day-summary-val">${doneSetsAll}/${totalSetsAll}</div><div class="day-summary-label">подходов</div></div>
        <div class="day-summary-stat"><div class="day-summary-val">${totalSetsAll > 0 ? Math.round((doneSetsAll / totalSetsAll) * 100) : 0}%</div><div class="day-summary-label">выполнено</div></div>
        ${sessionHtml}
      </div>`;
      html += `<button class="btn-end-workout" onclick="App.endWorkout()">Завершить тренировку</button>`;
    } else if (workout && workout.finishedAt) {
      const startMs = new Date(workout.startedAt).getTime();
      const endMs = new Date(workout.finishedAt).getTime();
      const durMin = Math.round((endMs - startMs) / 60000);
      html += `<div class="workout-finished-badge">Тренировка завершена — ${durMin} мин</div>`;
    } else {
      html += `<div class="day-summary">
        <div class="day-summary-stat"><div class="day-summary-val">${totalEx}</div><div class="day-summary-label">упражнений</div></div>
        <div class="day-summary-stat"><div class="day-summary-val">${totalSetsAll}</div><div class="day-summary-label">подходов</div></div>
        <div class="day-summary-stat"><div class="day-summary-val">~${Math.round(estMinutes)}</div><div class="day-summary-label">минут</div></div>
      </div>`;
      html += `<button class="btn-start-workout" onclick="App.startWorkout()">Начать тренировку</button>`;
    }

    html += skipHtml;
    html += dayData.exercises.map((ex, idx) => {
      const saved = workout && workout.exercises ? workout.exercises[idx] : null;
      const baseCls = ex.isBase ? 'base-exercise' : '';
      let detailsHtml = '';
      let checkHtml = '';
      const customName = this.getExerciseName(this.currentWeek, this.currentDay, idx, ex.name);

      if (ex.segments && !ex.isIndividual) {
        // Базовое упражнение с процентами
        detailsHtml = ex.segments.map(seg => {
          const weight = this.roundWeight(maxWeight * seg.percent / 100);
          return `<span class="ex-weight">${weight} кг</span> x ${seg.reps} повт. x ${seg.sets} подх.`;
        }).join('<br>');
      } else if (ex.isSpecial) {
        detailsHtml = ex.note ? this.escapeHtml(ex.note) : `${ex.totalReps} повторений`;
      } else if (ex.isBodyweight) {
        detailsHtml = `${ex.reps} повт. x ${ex.sets} подх. (без веса)`;
      } else if (ex.isIndividual) {
        // Показываем веса по подходам если есть
        if (saved && saved.setWeights && Object.keys(saved.setWeights).length > 0) {
          const weights = Object.values(saved.setWeights);
          const uniqueWeights = [...new Set(weights)];
          if (uniqueWeights.length === 1) {
            detailsHtml = `<span class="ex-weight">${uniqueWeights[0]} кг</span> x ${ex.reps} повт. x ${ex.sets} подх.`;
          } else {
            detailsHtml = weights.map((w, i) => `<span class="ex-weight">${w}</span>`).join(' / ') + ` кг x ${ex.reps} повт.`;
          }
        } else if (saved && saved.weight) {
          detailsHtml = `<span class="ex-weight">${saved.weight} кг</span> x ${ex.reps} повт. x ${ex.sets} подх.`;
        } else {
          detailsHtml = `<span class="text-yellow">Инд. вес</span> x ${ex.reps} повт. x ${ex.sets} подх.`;
        }
      }

      // Суперсет
      let supersetHtml = '';
      if (ex.superset) {
        supersetHtml = `<span class="superset-tag">+ суперсет: ${ex.superset.name}</span>`;
      }

      // Заметка
      let noteHtml = '';
      if (ex.note && !ex.isSpecial) {
        noteHtml = `<div class="ex-note">${this.escapeHtml(ex.note)}</div>`;
      }

      // Выполнение
      const completedSets = saved ? (saved.completedSets || 0) : 0;
      const totalSets = this.getTotalSets(ex);
      if (completedSets > 0) {
        checkHtml = `<div class="ex-check">${completedSets >= totalSets ? '&#10003; Выполнено' : `${completedSets}/${totalSets} подходов`}</div>`;
      }

      // Mini progress bar
      let progressHtml = '';
      if (totalSets > 0) {
        const pct = Math.round((completedSets / totalSets) * 100);
        progressHtml = `<div class="ex-progress-bar"><div class="ex-progress-fill" style="width:${pct}%"></div></div>`;
      }

      const doneClass = completedSets >= totalSets && totalSets > 0 ? 'ex-done' : '';
      const typeCls = ex.isIndividual ? 'individual-exercise' : (ex.isBodyweight ? 'bodyweight-exercise' : '');

      return `
        <div class="exercise-card ${baseCls} ${typeCls} ${doneClass}" onclick="App.openExercise(${idx})">
          <button class="ex-info-btn" onclick="event.stopPropagation(); App.showExerciseInfo(${idx})" title="Инфо">i</button>
          <div class="ex-name">${customName}</div>
          <div class="ex-details">${detailsHtml}</div>
          ${supersetHtml}
          ${noteHtml}
          ${checkHtml}
          ${progressHtml}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  // ==================== ЭКРАН: УПРАЖНЕНИЕ (ПОДХОДЫ) ====================
  openExercise(idx) {
    this.currentExIndex = idx;
    this.showScreen('exercise');
    // Save context for floating timer return
    this._timerContext = {
      cycleId: this.currentCycleId,
      week: this.currentWeek,
      day: this.currentDay,
      exIndex: idx
    };
    this.renderSets();
  },

  renderSets() {
    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const ex = dayData.exercises[this.currentExIndex];
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    const workout = cycle.workouts ? cycle.workouts[workoutKey] : null;
    const saved = workout && workout.exercises ? workout.exercises[this.currentExIndex] : null;

    document.getElementById('exercise-title').textContent = this.getExerciseName(this.currentWeek, this.currentDay, this.currentExIndex, ex.name);

    // Бейджи
    const badgeArea = document.getElementById('exercise-badge-area');
    let badges = [];
    if (ex.isBase) {
      badges.push('<span class="badge badge-base">Базовое</span>');
      badges.push('<span class="badge badge-rest">Отдых 3-5 мин</span>');
    } else {
      badges.push('<span class="badge badge-rest">Отдых 1-2 мин</span>');
    }
    if (ex.isIndividual) {
      badges.push('<span class="badge badge-individual">Инд. вес</span>');
    }
    badgeArea.innerHTML = badges.join('');

    const container = document.getElementById('sets-list');
    let html = '';

    // Заметка
    if (ex.note) {
      html += `<div class="exercise-note">${this.escapeHtml(ex.note)}</div>`;
    }

    if (ex.isSpecial) {
      // Специальное упражнение (Прощание с залом, Медитация)
      html += this.renderSpecialExercise(ex, saved);
    } else if (ex.segments && !ex.isIndividual) {
      // Базовое с процентами
      html += this.renderPercentSets(ex, saved, cycle.maxWeight);
    } else if (ex.isBodyweight) {
      // Без веса
      html += this.renderBodyweightSets(ex, saved);
    } else if (ex.isIndividual) {
      // Индивидуальный вес
      html += this.renderIndividualSets(ex, saved);
    }

    // Суперсет
    if (ex.superset) {
      html += `<div class="superset-divider">+ суперсет</div>`;
      const ss = ex.superset;
      const ssSaved = saved ? saved.superset : null;
      if (ss.isIndividual) {
        html += this.renderIndividualSets(ss, ssSaved, true);
      } else {
        html += this.renderBodyweightSets(ss, ssSaved, true);
      }
    }

    // Check if all sets done → show "Next exercise" button
    const allEx = dayData.exercises[this.currentExIndex];
    const allSaved = workout && workout.exercises ? workout.exercises[this.currentExIndex] : null;
    const allTotal = this.getTotalSets(allEx);
    const allDone = allSaved ? (allSaved.completedSets || 0) : 0;
    if (allDone >= allTotal && allTotal > 0) {
      html += `<button class="btn-next-exercise" onclick="App.advanceToNextExercise()">Следующее упражнение &rarr;</button>`;
    }

    container.innerHTML = html;
  },

  // Получить фактические повторения для подхода
  getActualReps(saved, setIdx, targetReps) {
    if (saved && saved.sets && saved.sets[setIdx] && saved.sets[setIdx].actualReps !== undefined) {
      return saved.sets[setIdx].actualReps;
    }
    return null;
  },

  // HTML для отображения повторений (кликабельно)
  repsHtml(setIdx, targetReps, actualReps, isSuperset = false) {
    if (actualReps !== null && actualReps !== targetReps) {
      return `<div class="set-reps editable" onclick="App.editReps(${setIdx}, ${targetReps}, ${isSuperset})"><span class="reps-actual">${actualReps}</span><span class="reps-target">/${targetReps}</span> повт.</div>`;
    }
    return `<div class="set-reps editable" onclick="App.editReps(${setIdx}, ${targetReps}, ${isSuperset})">${targetReps} повторений</div>`;
  },

  editReps(setIdx, targetReps, isSuperset = false) {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    const workout = cycle.workouts ? cycle.workouts[workoutKey] : null;
    const exData = workout && workout.exercises ? workout.exercises[this.currentExIndex] : null;
    const setData = isSuperset
      ? (exData && exData.superset && exData.superset.sets ? exData.superset.sets[setIdx] : null)
      : (exData && exData.sets ? exData.sets[setIdx] : null);
    const current = setData && setData.actualReps !== undefined ? setData.actualReps : targetReps;

    document.getElementById('modal-reps-input').value = current;
    document.getElementById('modal-reps-target').textContent = `Цель: ${targetReps}`;
    this._repsSetIdx = setIdx;
    this._repsIsSuperset = isSuperset;
    document.getElementById('modal-reps').classList.remove('hidden');
    setTimeout(() => {
      const inp = document.getElementById('modal-reps-input');
      inp.focus();
      inp.select();
    }, 100);
  },

  saveReps() {
    const val = parseInt(document.getElementById('modal-reps-input').value);
    if (isNaN(val) || val < 0) return;

    const setIdx = this._repsSetIdx;
    const isSuperset = this._repsIsSuperset;
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;

    if (!cycle.workouts) cycle.workouts = {};
    if (!cycle.workouts[workoutKey]) {
      cycle.workouts[workoutKey] = { exercises: {}, date: new Date().toISOString(), completed: false };
    }
    const workout = cycle.workouts[workoutKey];
    if (!workout.exercises) workout.exercises = {};
    const exKey = this.currentExIndex;
    if (!workout.exercises[exKey]) {
      workout.exercises[exKey] = { sets: {}, completedSets: 0 };
    }

    const exData = isSuperset
      ? (workout.exercises[exKey].superset || (workout.exercises[exKey].superset = { sets: {}, completedSets: 0 }))
      : workout.exercises[exKey];

    if (!exData.sets) exData.sets = {};
    if (!exData.sets[setIdx]) exData.sets[setIdx] = {};
    exData.sets[setIdx].actualReps = val;

    // Автоматически отметить подход выполненным если ввели повторения
    if (val > 0 && !exData.sets[setIdx].done) {
      exData.sets[setIdx].done = true;
      exData.sets[setIdx].timestamp = new Date().toISOString();
      exData.completedSets = Object.values(exData.sets).filter(s => s.done).length;
      this.checkWorkoutCompletion(workout);
    }

    this.saveData();
    this.closeModal();
    this.renderSets();
  },

  renderPercentSets(ex, saved, maxWeight) {
    let html = '';
    let setNum = 0;

    ex.segments.forEach((seg, segIdx) => {
      const calcWeight = this.roundWeight(maxWeight * seg.percent / 100);
      for (let i = 0; i < seg.sets; i++) {
        setNum++;
        const done = saved && saved.sets && saved.sets[setNum - 1] && saved.sets[setNum - 1].done;
        const doneClass = done ? 'done' : '';

        // Проверяем переопределение веса
        const overrideWeight = saved && saved.setWeights && saved.setWeights[setNum - 1] !== undefined
          ? saved.setWeights[setNum - 1] : null;
        const weight = overrideWeight !== null ? overrideWeight : calcWeight;
        const isOverridden = overrideWeight !== null;

        const perSide = this.getPerSide(weight);
        const perSideHtml = perSide !== null ? `<div class="set-plate-hint">по ${perSide} кг/сторону</div>` : '';
        const actualReps = this.getActualReps(saved, setNum - 1, seg.reps);

        html += `
          <div class="set-row">
            <div class="set-number">${setNum}</div>
            <div class="set-info">
              <div class="set-weight editable" onclick="App.showSetWeightInput(${setNum - 1}, false, ${calcWeight})">
                ${weight} кг <small>(${seg.percent}%)</small>
                ${isOverridden ? '<small class="override-mark">изм.</small>' : ''}
              </div>
              ${perSideHtml}
              ${this.repsHtml(setNum - 1, seg.reps, actualReps, false)}
            </div>
            <button class="set-check ${doneClass}" onclick="App.toggleSet(${setNum - 1})">
              ${done ? '&#10003;' : ''}
            </button>
          </div>
        `;
      }
    });

    return html;
  },

  renderIndividualSets(ex, saved, isSuperset = false) {
    let html = '';

    for (let i = 0; i < ex.sets; i++) {
      const done = saved && saved.sets && saved.sets[i] && saved.sets[i].done;
      const doneClass = done ? 'done' : '';
      const setWeight = saved && saved.setWeights && saved.setWeights[i] !== undefined
        ? saved.setWeights[i]
        : (saved && saved.weight ? saved.weight : null);

      const perSide = setWeight ? this.getPerSide(setWeight) : null;
      const perSideHtml = perSide !== null ? `<div class="set-plate-hint">по ${perSide} кг/сторону</div>` : '';
      const actualReps = this.getActualReps(saved, i, ex.reps);

      html += `
        <div class="set-row ${done ? 'set-done' : ''}">
          <div class="set-number">${i + 1}</div>
          <div class="set-info">
            <div class="set-weight-inline">
              <button class="weight-adj" onclick="event.stopPropagation(); App.quickAdjustWeight(${i}, -2.5, ${isSuperset})">−</button>
              <span class="set-weight individual" onclick="App.showSetWeightInput(${i}, ${isSuperset})">${setWeight ? setWeight + ' кг' : 'Вес'}</span>
              <button class="weight-adj" onclick="event.stopPropagation(); App.quickAdjustWeight(${i}, 2.5, ${isSuperset})">+</button>
            </div>
            ${perSideHtml}
            ${this.repsHtml(i, ex.reps, actualReps, isSuperset)}
          </div>
          <button class="set-check ${doneClass}" onclick="App.toggleSet(${i}, ${isSuperset})">
            ${done ? '&#10003;' : ''}
          </button>
        </div>
      `;
    }

    return html;
  },

  renderBodyweightSets(ex, saved, isSuperset = false) {
    let html = '';

    for (let i = 0; i < ex.sets; i++) {
      const done = saved && saved.sets && saved.sets[i] && saved.sets[i].done;
      const doneClass = done ? 'done' : '';
      const actualReps = this.getActualReps(saved, i, ex.reps);

      html += `
        <div class="set-row">
          <div class="set-number">${i + 1}</div>
          <div class="set-info">
            <div class="set-weight" style="color: var(--t3)">Без веса</div>
            ${this.repsHtml(i, ex.reps, actualReps, isSuperset)}
          </div>
          <button class="set-check ${doneClass}" onclick="App.toggleSet(${i}, ${isSuperset})">
            ${done ? '&#10003;' : ''}
          </button>
        </div>
      `;
    }

    return html;
  },

  renderSpecialExercise(ex, saved) {
    let html = '';

    if (ex.totalReps > 0) {
      const completedReps = saved && saved.specialReps ? saved.specialReps : 0;
      html += `
        <div class="set-row">
          <div class="set-info">
            <div class="set-weight">Цель: ${ex.totalReps} повторений</div>
            <div class="set-reps">За любое количество подходов</div>
          </div>
        </div>
        <div class="special-input-row">
          <span>Сделал:</span>
          <input type="number" value="${completedReps}" inputmode="numeric"
            onchange="App.saveSpecialReps(parseInt(this.value) || 0)">
          <span>/ ${ex.totalReps}</span>
        </div>
      `;
    } else {
      // Медитация и подобное
      const done = saved && saved.sets && saved.sets[0] && saved.sets[0].done;
      html += `
        <div class="set-row">
          <div class="set-info">
            <div class="set-weight" style="color: var(--warn)">${this.escapeHtml(ex.note || ex.name)}</div>
          </div>
          <button class="set-check ${done ? 'done' : ''}" onclick="App.toggleSet(0)">
            ${done ? '&#10003;' : ''}
          </button>
        </div>
      `;
    }

    return html;
  },

  // ==================== ЛОГИКА ПОДХОДОВ ====================
  toggleSet(setIdx, isSuperset = false) {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;

    // Создаём структуру если нет
    if (!cycle.workouts) cycle.workouts = {};
    if (!cycle.workouts[workoutKey]) {
      cycle.workouts[workoutKey] = {
        exercises: {},
        date: new Date().toISOString(),
        completed: false
      };
    }

    const workout = cycle.workouts[workoutKey];
    if (!workout.exercises) workout.exercises = {};

    const exKey = this.currentExIndex;
    if (!workout.exercises[exKey]) {
      workout.exercises[exKey] = { sets: {}, completedSets: 0 };
    }

    const exData = isSuperset
      ? (workout.exercises[exKey].superset || (workout.exercises[exKey].superset = { sets: {}, completedSets: 0 }))
      : workout.exercises[exKey];

    if (!exData.sets) exData.sets = {};

    // Переключаем (сохраняем actualReps при повторной отметке)
    if (exData.sets[setIdx] && exData.sets[setIdx].done) {
      exData.sets[setIdx].done = false;
    } else {
      if (!exData.sets[setIdx]) exData.sets[setIdx] = {};
      exData.sets[setIdx].done = true;
      exData.sets[setIdx].timestamp = new Date().toISOString();
    }

    // Считаем выполненные
    exData.completedSets = Object.values(exData.sets).filter(s => s.done).length;

    // Проверяем завершение всей тренировки
    this.checkWorkoutCompletion(workout);

    this.saveData();
    this.renderSets();

    // Auto-start rest timer when marking set as done
    if (exData.sets[setIdx] && exData.sets[setIdx].done) {
      if (!this.timerRunning) {
        const weekData = PROGRAM.find(w => w.week === this.currentWeek);
        const dayData = weekData.days.find(d => d.day === this.currentDay);
        const ex = dayData.exercises[this.currentExIndex];
        const restTime = ex.isBase ? 180 : 90;
        this.setTimer(restTime);
        this.toggleTimer();
      }
    }
  },

  saveSpecialReps(reps) {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;

    if (!cycle.workouts) cycle.workouts = {};
    if (!cycle.workouts[workoutKey]) {
      cycle.workouts[workoutKey] = {
        exercises: {},
        date: new Date().toISOString(),
        completed: false
      };
    }

    const workout = cycle.workouts[workoutKey];
    if (!workout.exercises) workout.exercises = {};

    const exKey = this.currentExIndex;
    if (!workout.exercises[exKey]) {
      workout.exercises[exKey] = { sets: {}, completedSets: 0 };
    }

    workout.exercises[exKey].specialReps = reps;

    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const ex = dayData.exercises[this.currentExIndex];

    if (reps >= ex.totalReps) {
      workout.exercises[exKey].sets = { 0: { done: true } };
      workout.exercises[exKey].completedSets = 1;
    } else {
      workout.exercises[exKey].sets = { 0: { done: false } };
      workout.exercises[exKey].completedSets = 0;
    }

    this.checkWorkoutCompletion(workout);
    this.saveData();
  },

  checkWorkoutCompletion(workout) {
    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);

    let allDone = true;
    dayData.exercises.forEach((ex, idx) => {
      const saved = workout.exercises ? workout.exercises[idx] : null;
      const totalSets = this.getTotalSets(ex);
      const completedSets = saved ? (saved.completedSets || 0) : 0;
      if (completedSets < totalSets) allDone = false;
      // Проверяем суперсет
      if (ex.superset) {
        const ssTotalSets = ex.superset.sets || 0;
        const ssCompleted = saved && saved.superset ? (saved.superset.completedSets || 0) : 0;
        if (ssCompleted < ssTotalSets) allDone = false;
      }
    });

    workout.completed = allDone;
  },

  getTotalSets(ex) {
    if (ex.isSpecial) return ex.totalReps > 0 ? 1 : 1;
    let total = 0;
    if (ex.segments && !ex.isIndividual) {
      total = ex.segments.reduce((sum, seg) => sum + seg.sets, 0);
    } else {
      total = ex.sets || 0;
    }
    if (ex.superset) total += ex.superset.sets || 0;
    return total;
  },

  // ==================== ВВОД ВЕСА ====================
  // Ввод веса для конкретного подхода
  showSetWeightInput(setIdx, isSuperset = false, defaultWeight = null) {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    const workout = cycle.workouts ? cycle.workouts[workoutKey] : null;
    const exKey = this.currentExIndex;
    const saved = workout && workout.exercises ? workout.exercises[exKey] : null;
    const exData = isSuperset ? (saved ? saved.superset : null) : saved;

    // Текущий вес подхода или общий вес
    let currentWeight = '';
    if (exData && exData.setWeights && exData.setWeights[setIdx] !== undefined) {
      currentWeight = exData.setWeights[setIdx];
    } else if (exData && exData.weight) {
      currentWeight = exData.weight;
    } else if (defaultWeight !== null) {
      currentWeight = defaultWeight;
    }

    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const ex = dayData.exercises[this.currentExIndex];
    const exName = isSuperset && ex.superset ? ex.superset.name : this.getExerciseName(this.currentWeek, this.currentDay, this.currentExIndex, ex.name);

    document.getElementById('modal-weight-title').textContent = `${exName} — подход ${setIdx + 1}`;
    document.getElementById('modal-weight-input').value = currentWeight;
    document.getElementById('modal-weight').classList.remove('hidden');

    this.modalCallback = (weight) => {
      this.saveSetWeight(setIdx, weight, isSuperset);
    };

    setTimeout(() => document.getElementById('modal-weight-input').focus(), 100);
  },

  saveSetWeight(setIdx, weight, isSuperset) {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;

    if (!cycle.workouts) cycle.workouts = {};
    if (!cycle.workouts[workoutKey]) {
      cycle.workouts[workoutKey] = {
        exercises: {},
        date: new Date().toISOString(),
        completed: false
      };
    }

    const workout = cycle.workouts[workoutKey];
    if (!workout.exercises) workout.exercises = {};

    const exKey = this.currentExIndex;
    if (!workout.exercises[exKey]) {
      workout.exercises[exKey] = { sets: {}, completedSets: 0 };
    }

    let exData;
    if (isSuperset) {
      if (!workout.exercises[exKey].superset) {
        workout.exercises[exKey].superset = { sets: {}, completedSets: 0 };
      }
      exData = workout.exercises[exKey].superset;
    } else {
      exData = workout.exercises[exKey];
    }

    // Сохраняем вес для конкретного подхода
    if (!exData.setWeights) exData.setWeights = {};
    exData.setWeights[setIdx] = weight;

    // Также обновляем общий вес (последний введённый)
    exData.weight = weight;

    // Auto-fill remaining empty sets with this weight
    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const curEx = isSuperset
      ? dayData.exercises[this.currentExIndex].superset
      : dayData.exercises[this.currentExIndex];
    if (curEx && curEx.isIndividual && curEx.sets) {
      for (let i = setIdx + 1; i < curEx.sets; i++) {
        if (!exData.setWeights[i]) exData.setWeights[i] = weight;
      }
    }

    this.saveData();
    this.renderSets();
  },

  // Старый метод для совместимости
  showWeightInput(isSuperset = false) {
    this.showSetWeightInput(0, isSuperset);
  },

  adjustModalWeight(delta) {
    const input = document.getElementById('modal-weight-input');
    const current = parseFloat(input.value) || 0;
    const newVal = Math.max(0, Math.round((current + delta) * 10) / 10);
    input.value = newVal;
  },

  initModalKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const modals = ['modal-weight', 'modal-max', 'modal-name', 'modal-timer', 'modal-reps'];
      for (const id of modals) {
        if (!document.getElementById(id).classList.contains('hidden')) {
          e.preventDefault();
          document.getElementById(id).querySelector('.btn-primary').click();
          return;
        }
      }
    });
  },

  saveWeight() {
    const weight = parseFloat(document.getElementById('modal-weight-input').value);
    if (!weight || weight <= 0) {
      this.showToast('Введи корректный вес!');
      return;
    }

    if (this.modalCallback) {
      this.modalCallback(weight);
    }

    this.closeModal();
  },

  closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    this.modalCallback = null;
  },

  // ==================== ИМЕНА УПРАЖНЕНИЙ ====================
  getExerciseName(weekNum, dayName, exIdx, defaultName) {
    const cycle = this.getCycle();
    if (!cycle || !cycle.customNames) return defaultName;
    const key = `${weekNum}-${dayName}-${exIdx}`;
    return cycle.customNames[key] || defaultName;
  },

  editExerciseName() {
    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const ex = dayData.exercises[this.currentExIndex];
    const currentName = this.getExerciseName(this.currentWeek, this.currentDay, this.currentExIndex, ex.name);

    document.getElementById('modal-name-input').value = currentName;
    document.getElementById('modal-name').classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-name-input').focus(), 100);
  },

  saveExerciseName() {
    const newName = document.getElementById('modal-name-input').value.trim();
    if (!newName) return;

    const cycle = this.getCycle();
    if (!cycle.customNames) cycle.customNames = {};

    const key = `${this.currentWeek}-${this.currentDay}-${this.currentExIndex}`;

    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const ex = dayData.exercises[this.currentExIndex];

    if (newName === ex.name) {
      delete cycle.customNames[key];
    } else {
      cycle.customNames[key] = newName;
    }

    this.saveData();
    document.getElementById('exercise-title').textContent = newName;
    this.closeModal();
  },

  // ==================== ИНФО ПО УПРАЖНЕНИЮ ====================
  _infoShowAll: false,

  showExerciseInfo(exIdx) {
    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const ex = dayData.exercises[exIdx];
    if (!ex || ex.isSpecial) return;

    const exName = ex.name;
    const cycle = this.getCycle();
    const allCycles = this.data.cycles;

    // Собираем подробные записи из ВСЕХ проходок
    const records = [];

    allCycles.forEach(c => {
      if (!c.workouts) return;
      PROGRAM.forEach(week => {
        week.days.forEach(day => {
          const key = `${week.week}-${day.day}`;
          const workout = c.workouts[key];
          if (!workout || !workout.exercises || workout.skipped) return;

          day.exercises.forEach((pEx, pIdx) => {
            if (pEx.name !== exName) return;
            const exData = workout.exercises[pIdx];
            if (!exData) return;

            if (c.id === cycle.id && week.week === this.currentWeek && day.day === this.currentDay && pIdx === exIdx) return;

            const sets = [];
            let completedSets = 0;
            let totalSets = 0;

            if (pEx.segments && !pEx.isIndividual) {
              let setNum = 0;
              pEx.segments.forEach(seg => {
                const calcW = this.roundWeight(c.maxWeight * seg.percent / 100);
                for (let s = 0; s < seg.sets; s++) {
                  totalSets++;
                  const ov = exData.setWeights && exData.setWeights[setNum] !== undefined ? exData.setWeights[setNum] : null;
                  const w = ov !== null ? ov : calcW;
                  const done = exData.sets && exData.sets[setNum] && exData.sets[setNum].done;
                  const actualReps = exData.sets && exData.sets[setNum] && exData.sets[setNum].actualReps !== undefined
                    ? exData.sets[setNum].actualReps : seg.reps;
                  if (done) {
                    completedSets++;
                    sets.push({ weight: w, reps: actualReps });
                  }
                  setNum++;
                }
              });
            } else if (pEx.isIndividual) {
              totalSets = pEx.sets;
              for (let i = 0; i < pEx.sets; i++) {
                const w = exData.setWeights && exData.setWeights[i] !== undefined
                  ? exData.setWeights[i] : (exData.weight || 0);
                const done = exData.sets && exData.sets[i] && exData.sets[i].done;
                const actualReps = exData.sets && exData.sets[i] && exData.sets[i].actualReps !== undefined
                  ? exData.sets[i].actualReps : pEx.reps;
                if (done) {
                  completedSets++;
                  sets.push({ weight: w, reps: actualReps });
                }
              }
            } else if (pEx.isBodyweight) {
              totalSets = pEx.sets;
              for (let i = 0; i < pEx.sets; i++) {
                const done = exData.sets && exData.sets[i] && exData.sets[i].done;
                const actualReps = exData.sets && exData.sets[i] && exData.sets[i].actualReps !== undefined
                  ? exData.sets[i].actualReps : pEx.reps;
                if (done) {
                  completedSets++;
                  sets.push({ weight: 0, reps: actualReps });
                }
              }
            }

            if (completedSets > 0) {
              records.push({
                cycleName: c.name,
                week: week.week,
                day: day.day,
                sets,
                completedSets,
                totalSets
              });
            }
          });
        });
      });
    });

    this._infoRecords = records;
    this._infoAllCycles = allCycles;
    this._infoShowAll = false;
    this._infoCurrentEx = ex;
    this._infoCurrentCycle = cycle;
    this.renderExerciseInfoModal(ex.name, records, allCycles, false);
  },

  renderExerciseInfoModal(name, records, allCycles, showAll) {
    const modal = document.getElementById('modal-info');
    const title = document.getElementById('modal-info-title');
    const body = document.getElementById('modal-info-body');

    title.textContent = name;

    // 4.9 - Week phase labels
    const phaseMap = w => {
      if (w <= 2) return 'Объём';
      if (w <= 4) return 'Сила';
      if (w <= 6) return 'Интенсивность';
      if (w <= 8) return 'Пик';
      return 'Максимум';
    };

    // 4.6 - Today's plan section
    let planHtml = '';
    const curEx = this._infoCurrentEx;
    const curCycle = this._infoCurrentCycle;
    if (curEx) {
      let planSets = [];
      if (curEx.segments && !curEx.isIndividual) {
        curEx.segments.forEach(seg => {
          const calcW = this.roundWeight(curCycle.maxWeight * seg.percent / 100);
          planSets.push({ weight: calcW, reps: seg.reps, sets: seg.sets });
        });
      } else if (curEx.isIndividual) {
        planSets.push({ weight: 0, reps: curEx.reps, sets: curEx.sets, individual: true });
      } else if (curEx.isBodyweight) {
        planSets.push({ weight: 0, reps: curEx.reps, sets: curEx.sets, bodyweight: true });
      }
      if (planSets.length > 0) {
        planHtml += `<div class="info-session info-plan">`;
        planHtml += `<div class="info-session-header">
          <span>Сегодня: Нед.${this.currentWeek} ${this.currentDay}</span>
          <span class="info-phase">${phaseMap(this.currentWeek)}</span>
        </div>`;
        planHtml += `<div class="info-sets-detail">`;
        planSets.forEach(p => {
          if (p.individual) {
            planHtml += `<div class="info-set-group">
              <span class="info-set-reps">Индивид. вес</span>
              <span class="info-set-x">&times;</span>
              <span class="info-set-reps">${p.reps} повт.</span>
              <span class="info-set-x">&times;</span>
              <span class="info-set-count">${p.sets} подх.</span>
            </div>`;
          } else if (p.bodyweight) {
            planHtml += `<div class="info-set-group">
              <span class="info-set-reps">${p.reps} повт.</span>
              <span class="info-set-x">&times;</span>
              <span class="info-set-count">${p.sets} подх.</span>
            </div>`;
          } else {
            planHtml += `<div class="info-set-group">
              <span class="info-set-weight">${p.weight} кг</span>
              <span class="info-set-x">&times;</span>
              <span class="info-set-reps">${p.reps} повт.</span>
              <span class="info-set-x">&times;</span>
              <span class="info-set-count">${p.sets} подх.</span>
            </div>`;
          }
        });
        planHtml += `</div></div>`;
      }
    }

    if (records.length === 0) {
      body.innerHTML = planHtml + '<div class="info-empty">Нет данных о предыдущих тренировках</div>';
      modal.classList.remove('hidden');
      return;
    }

    const displayed = showAll ? [...records].reverse() : records.slice(-3).reverse();
    const showCycle = allCycles.length > 1;
    let html = '';

    // PR
    const allWeights = records.flatMap(r => r.sets.map(s => s.weight)).filter(w => w > 0);
    if (allWeights.length > 0) {
      const pr = Math.max(...allWeights);
      html += `<div class="info-pr">PR: ${pr} кг</div>`;
    }

    // 4.6 - Insert today's plan before history
    html += planHtml;

    // 4.4 - Find session with max weight for PR highlight
    let maxSessionWeight = 0;
    let maxSessionIdx = -1;
    displayed.forEach((r, i) => {
      const sessionMax = Math.max(0, ...r.sets.map(s => s.weight));
      if (sessionMax > maxSessionWeight) {
        maxSessionWeight = sessionMax;
        maxSessionIdx = i;
      }
    });

    displayed.forEach((r, rIdx) => {
      const allDone = r.completedSets >= r.totalSets;
      const cycleLabel = showCycle ? `<span class="info-cycle">${this.escapeHtml(r.cycleName)}</span> ` : '';

      // 4.3 - Best 1RM per session
      let best1rm = 0;
      r.sets.forEach(s => {
        if (s.weight > 0) {
          const e = this.calc1RM(s.weight, s.reps);
          if (e > best1rm) best1rm = e;
        }
      });
      const rm1Html = best1rm > 0 ? `<span class="info-1rm-val">1RM: ${best1rm} кг</span>` : '';

      // 4.5 - Volume per session
      const vol = r.sets.reduce((s, x) => s + x.weight * x.reps, 0);
      const volHtml = vol > 0 ? `<span class="info-vol">${vol} кг</span>` : '';

      // 4.8 - Color-coded completion
      const ratio = r.totalSets > 0 ? r.completedSets / r.totalSets : 0;
      let completionCls = '';
      if (ratio >= 1) completionCls = 'all-done';
      else if (ratio > 0.5) completionCls = 'half-done';
      else completionCls = 'low-done';

      // 4.9 - Phase label
      const phase = phaseMap(r.week);

      // 4.4 - PR session highlight
      const prClass = rIdx === maxSessionIdx && maxSessionWeight > 0 ? ' info-session-pr' : '';

      html += `<div class="info-session${prClass}">`;
      html += `<div class="info-session-header">
        <span>${cycleLabel}Нед.${r.week} ${r.day} <span class="info-phase">${phase}</span></span>
        <span style="display:flex;align-items:center;gap:6px;">
          ${rm1Html}${volHtml}
          <span class="info-sets ${completionCls}">${r.completedSets}/${r.totalSets}</span>
        </span>
      </div>`;

      // Группируем подходы по весу+повторениям
      const groups = [];
      r.sets.forEach(s => {
        const last = groups[groups.length - 1];
        if (last && last.weight === s.weight && last.reps === s.reps) {
          last.count++;
        } else {
          groups.push({ weight: s.weight, reps: s.reps, count: 1 });
        }
      });

      // 4.10 - Find heaviest weight group
      let heaviestWeight = 0;
      groups.forEach(g => { if (g.weight > heaviestWeight) heaviestWeight = g.weight; });

      html += `<div class="info-sets-detail">`;
      groups.forEach(g => {
        const isBest = g.weight > 0 && g.weight === heaviestWeight;
        const bestCls = isBest ? ' info-best-set' : '';
        const bestTag = isBest ? '<span class="info-best-tag">лучший</span>' : '';
        if (g.weight > 0) {
          html += `<div class="info-set-group${bestCls}">
            <span class="info-set-weight">${g.weight} кг</span>
            <span class="info-set-x">&times;</span>
            <span class="info-set-reps">${g.reps} повт.</span>
            ${g.count > 1 ? `<span class="info-set-x">&times;</span><span class="info-set-count">${g.count} подх.</span>` : ''}
            ${bestTag}
          </div>`;
        } else {
          html += `<div class="info-set-group">
            <span class="info-set-reps">${g.reps} повт.</span>
            ${g.count > 1 ? `<span class="info-set-x">&times;</span><span class="info-set-count">${g.count} подх.</span>` : ''}
          </div>`;
        }
      });
      html += `</div></div>`;
    });

    if (!showAll && records.length > 3) {
      html += `<button class="info-show-all" onclick="App.toggleInfoShowAll()">Показать всю историю (${records.length})</button>`;
    } else if (showAll && records.length > 3) {
      html += `<button class="info-show-all" onclick="App.toggleInfoShowAll()">Скрыть</button>`;
    }

    // 4.1 - 1RM progression chart with labels (renderSvgLineChart instead of renderSparkline)
    if (records.length >= 2) {
      const rmData = records.map(r => {
        let best1RM = 0;
        r.sets.forEach(s => {
          if (s.weight > 0) {
            const e1rm = this.calc1RM(s.weight, s.reps);
            if (e1rm > best1RM) best1RM = e1rm;
          }
        });
        return { label: 'Н' + r.week + ' ' + r.day, value: best1RM };
      }).filter(d => d.value > 0);

      if (rmData.length >= 2) {
        const first = rmData[0].value;
        const last = rmData[rmData.length - 1].value;
        const diff = last - first;
        const diffStr = diff > 0 ? '+' + diff.toFixed(1) : diff.toFixed(1);
        const trendColor = diff >= 0 ? 'var(--accent)' : '#ff3b30';

        html += `<div class="info-1rm-section">`;
        html += `<div class="info-1rm-header">
          <span>Расчётный 1RM (Epley)</span>
          <span style="color:${trendColor};font-family:Oswald;font-weight:600">${diffStr} кг</span>
        </div>`;
        html += `<div class="info-1rm-chart">${this.renderSvgLineChart(rmData, { height: 100 })}</div>`;
        html += `</div>`;
      }
    }

    body.innerHTML = html;
    modal.classList.remove('hidden');
  },

  toggleInfoShowAll() {
    this._infoShowAll = !this._infoShowAll;
    const title = document.getElementById('modal-info-title').textContent;
    this.renderExerciseInfoModal(title, this._infoRecords, this._infoAllCycles, this._infoShowAll);
  },

  // ==================== УПРАВЛЕНИЕ ТРЕНИРОВКОЙ ====================
  startWorkout() {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    if (!cycle.workouts) cycle.workouts = {};
    if (!cycle.workouts[workoutKey]) {
      cycle.workouts[workoutKey] = { exercises: {}, date: new Date().toISOString(), completed: false };
    }
    cycle.workouts[workoutKey].startedAt = new Date().toISOString();
    delete cycle.workouts[workoutKey].finishedAt;
    this.saveData();
    this.showToast('Тренировка начата!');
    this.showDay();
  },

  endWorkout() {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    if (cycle.workouts && cycle.workouts[workoutKey]) {
      cycle.workouts[workoutKey].finishedAt = new Date().toISOString();
    }
    this.saveData();
    this.showToast('Тренировка завершена!');
    this.showDay();
  },

  // ==================== СВАЙПЫ И НАВИГАЦИЯ ====================
  initSwipeGestures() {
    let startX = 0, startY = 0, swiping = null;
    document.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = null;
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
        swiping = dx > 0 ? 'right' : 'left';
      }
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (!swiping) return;
      const dx = e.changedTouches[0].clientX - startX;
      // Swipe on day screen → navigate between days
      if (document.getElementById('screen-day').classList.contains('active') && Math.abs(dx) > 80) {
        if (swiping === 'left') this.nextDay();
        else this.prevDay();
      }
      // Swipe on cycle card → reveal delete
      const card = e.target.closest('.cycle-card');
      if (card && swiping === 'left' && Math.abs(dx) > 80) {
        card.style.transform = 'translateX(-80px)';
        setTimeout(() => { card.style.transform = ''; }, 3000);
      }
      swiping = null;
    });
  },

  _getDaysList() {
    const list = [];
    PROGRAM.forEach(w => w.days.forEach(d => list.push({ week: w.week, day: d.day })));
    return list;
  },

  prevDay() {
    const list = this._getDaysList();
    const idx = list.findIndex(d => d.week === this.currentWeek && d.day === this.currentDay);
    if (idx > 0) this.openDay(list[idx - 1].week, list[idx - 1].day);
  },

  nextDay() {
    const list = this._getDaysList();
    const idx = list.findIndex(d => d.week === this.currentWeek && d.day === this.currentDay);
    if (idx < list.length - 1) this.openDay(list[idx + 1].week, list[idx + 1].day);
  },

  // ==================== INLINE WEIGHT ±BUTTONS ====================
  quickAdjustWeight(setIdx, delta, isSuperset) {
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    if (!cycle.workouts) cycle.workouts = {};
    if (!cycle.workouts[workoutKey]) {
      cycle.workouts[workoutKey] = { exercises: {}, date: new Date().toISOString(), completed: false };
    }
    const workout = cycle.workouts[workoutKey];
    if (!workout.exercises) workout.exercises = {};
    const exKey = this.currentExIndex;
    if (!workout.exercises[exKey]) workout.exercises[exKey] = { sets: {}, completedSets: 0 };

    let exData = isSuperset
      ? (workout.exercises[exKey].superset || (workout.exercises[exKey].superset = { sets: {}, completedSets: 0 }))
      : workout.exercises[exKey];

    if (!exData.setWeights) exData.setWeights = {};
    const current = exData.setWeights[setIdx] !== undefined ? exData.setWeights[setIdx] : (exData.weight || 0);
    const newW = Math.max(0, Math.round((current + delta) * 10) / 10);
    this.saveSetWeight(setIdx, newW, isSuperset);
  },

  // ==================== ADVANCE TO NEXT EXERCISE ====================
  advanceToNextExercise() {
    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const cycle = this.getCycle();
    const workoutKey = `${this.currentWeek}-${this.currentDay}`;
    const workout = cycle.workouts ? cycle.workouts[workoutKey] : null;

    for (let i = this.currentExIndex + 1; i < dayData.exercises.length; i++) {
      const ex = dayData.exercises[i];
      const saved = workout && workout.exercises ? workout.exercises[i] : null;
      const totalSets = this.getTotalSets(ex);
      const completedSets = saved ? (saved.completedSets || 0) : 0;
      if (completedSets < totalSets) {
        this.openExercise(i);
        return;
      }
    }
    this.showToast('Тренировка завершена!');
    this.showDay();
  },

  // ==================== COLLAPSE WEEKS ====================
  expandWeek(n) {
    this._expandedWeeks[n] = !this._expandedWeeks[n];
    this.renderWeeks();
  },

  // ==================== ЭКРАН: НАСТРОЙКИ ====================
  showSettings() {
    this.showScreen('settings');
    this.renderSettings();
  },

  renderSettings() {
    const container = document.getElementById('settings-content');
    const allDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const selected = this.data.trainingDays || ['Пн', 'Ср', 'Пт'];

    let daysHtml = allDays.map(d => {
      const isActive = selected.includes(d);
      return `<button class="settings-day-btn ${isActive ? 'active' : ''}" onclick="App.toggleTrainingDay('${d}')">${d}</button>`;
    }).join('');

    const barWeight = this.data.barWeight || 20;
    const weightStep = this.data.weightStep || 0.5;

    container.innerHTML = `
      <div class="settings-section">
        <div class="settings-label">Дни тренировок</div>
        <div class="settings-hint">Выбери 3 дня, в которые тренируешься</div>
        <div class="settings-days-row">${daysHtml}</div>
      </div>
      <div class="settings-section">
        <div class="settings-label">Вес грифа (кг)</div>
        <input type="number" id="settings-bar-weight" class="form-input" value="${barWeight}" step="0.5" inputmode="decimal" onchange="App.saveBarWeightSetting(this.value)">
      </div>
      <div class="settings-section">
        <div class="settings-label">Шаг округления веса</div>
        <div class="settings-hint">Минимальный шаг блинов</div>
        <div class="settings-step-row">
          <button class="settings-step-btn ${weightStep === 0.5 ? 'active' : ''}" onclick="App.setWeightStep(0.5)">0.5 кг</button>
          <button class="settings-step-btn ${weightStep === 1 ? 'active' : ''}" onclick="App.setWeightStep(1)">1 кг</button>
          <button class="settings-step-btn ${weightStep === 2.5 ? 'active' : ''}" onclick="App.setWeightStep(2.5)">2.5 кг</button>
        </div>
      </div>
    `;
  },

  toggleTrainingDay(day) {
    let days = this.data.trainingDays || ['Пн', 'Ср', 'Пт'];
    if (days.includes(day)) {
      if (days.length <= 1) return; // keep at least 1
      days = days.filter(d => d !== day);
    } else {
      if (days.length >= 3) {
        // Remove the first selected, add new one
        days.shift();
      }
      days.push(day);
    }
    // Sort by weekday order
    const order = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    days.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    this.data.trainingDays = days;
    this.saveData();
    this.renderSettings();
  },

  saveBarWeightSetting(val) {
    const w = parseFloat(val);
    if (!w || w <= 0) return;
    this.data.barWeight = w;
    this.saveData();
  },

  setWeightStep(step) {
    this.data.weightStep = step;
    this.saveData();
    this.renderSettings();
  },

  // ==================== ТАЙМЕР ====================
  setTimer(seconds) {
    this.timerTarget = seconds;
    this.timerSeconds = seconds;
    this.timerRunning = false;
    this.timerEndAt = null;
    clearInterval(this.timerInterval);

    this.updateTimerDisplay();

    // Подсветка активной кнопки
    document.querySelectorAll('.timer-btn').forEach(btn => {
      const btnSec = parseInt(btn.textContent.split(':')[0]) * 60 + parseInt(btn.textContent.split(':')[1] || 0);
      // Нужно парсить MM:SS
      btn.classList.toggle('active', false);
    });

    const btnToggle = document.getElementById('btn-timer-toggle');
    btnToggle.textContent = 'Старт';
    btnToggle.classList.remove('running');
  },

  toggleTimer() {
    if (this.timerRunning) {
      // Пауза
      this.timerRunning = false;
      this.timerEndAt = null;
      clearInterval(this.timerInterval);
      this.releaseWakeLock();
      this.stopMediaSession();
      const btn = document.getElementById('btn-timer-toggle');
      btn.textContent = 'Старт';
      btn.classList.remove('running');
    } else {
      // Старт
      if (this.timerSeconds <= 0 && this.timerTarget > 0) {
        this.timerSeconds = this.timerTarget;
      }
      if (this.timerSeconds <= 0) {
        this.timerSeconds = 120;
        this.timerTarget = 120;
      }

      this.timerRunning = true;
      this.timerEndAt = Date.now() + this.timerSeconds * 1000;
      this.requestWakeLock();
      this.startMediaSession();
      const btn = document.getElementById('btn-timer-toggle');
      btn.textContent = 'Пауза';
      btn.classList.add('running');

      this.timerInterval = setInterval(() => {
        const remaining = Math.ceil((this.timerEndAt - Date.now()) / 1000);
        this.timerSeconds = Math.max(0, remaining);
        this.updateTimerDisplay();

        if (this.timerSeconds <= 0) {
          clearInterval(this.timerInterval);
          this.timerRunning = false;
          this.timerEndAt = null;
          btn.textContent = 'Старт';
          btn.classList.remove('running');
          this.timerFinished();
        }
      }, 250);
    }
  },

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timerRunning = false;
    this.timerEndAt = null;
    this.releaseWakeLock();
    this.stopMediaSession();
    this.timerSeconds = this.timerTarget || 0;
    this.updateTimerDisplay();

    const btn = document.getElementById('btn-timer-toggle');
    btn.textContent = 'Старт';
    btn.classList.remove('running');

    const display = document.getElementById('timer-display');
    display.classList.remove('running', 'warning', 'done');
    document.getElementById('timer-section').classList.remove('timer-active', 'timer-warning', 'timer-done');
    this.updateFloatingTimer();
  },

  updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const section = document.getElementById('timer-section');
    const ring = document.getElementById('timer-ring-progress');
    const minutes = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    display.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

    display.classList.remove('running', 'warning', 'done');
    section.classList.remove('timer-active', 'timer-warning', 'timer-done');

    if (this.timerRunning) {
      if (this.timerSeconds <= 10) {
        display.classList.add('warning');
        section.classList.add('timer-warning');
      } else {
        display.classList.add('running');
        section.classList.add('timer-active');
      }
    }
    if (this.timerSeconds <= 0 && this.timerTarget > 0) {
      display.classList.add('done');
      section.classList.add('timer-done');
    }

    // Progress bar
    const bar = document.getElementById('timer-progress-fill');
    if (bar) {
      const pct = this.timerTarget > 0 ? (this.timerSeconds / this.timerTarget) * 100 : 0;
      bar.style.width = pct + '%';
    }

    // Media Session + floating timer
    this.updateMediaSession();
    this.updateFloatingTimer();
  },

  timerFinished() {
    const display = document.getElementById('timer-display');
    display.classList.add('done');
    display.textContent = '0:00';

    // Release wake lock & media session
    this.releaseWakeLock();
    this.stopMediaSession();

    // Вибрация
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Уведомление на экране блокировки
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('GRIND', {
          body: 'Время отдыха вышло! Следующий подход.',
          icon: 'icon-192.png',
          tag: 'bench100-timer',
          requireInteraction: false
        });
      } catch (e) {}
    }

    // Auto-scroll to next unchecked set
    setTimeout(() => {
      const next = document.querySelector('.set-check:not(.done)');
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);

    // Звуковой сигнал через Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playBeep(880, ctx.currentTime, 0.15);
      playBeep(880, ctx.currentTime + 0.2, 0.15);
      playBeep(1200, ctx.currentTime + 0.4, 0.3);
    } catch (e) {}
  },

  // ==================== MEDIA SESSION (экран блокировки) ====================
  _createSilentAudio() {
    const sr = 8000, len = sr;
    const buf = new ArrayBuffer(44 + len);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len, true); w(8, 'WAVE');
    w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, 'data'); v.setUint32(40, len, true);
    for (let i = 0; i < len; i++) v.setUint8(44 + i, 128);
    const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    audio.loop = true;
    return audio;
  },

  startMediaSession() {
    try {
      if (!this._silentAudio) this._silentAudio = this._createSilentAudio();
      this._silentAudio.play().catch(() => {});
      if ('mediaSession' in navigator) {
        const t = this._formatTimer(this.timerSeconds);
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Отдых — ' + t,
          artist: 'GRIND',
          album: 'Следующий подход',
          artwork: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('pause', () => { if (this.timerRunning) this.toggleTimer(); });
        navigator.mediaSession.setActionHandler('play', () => { if (!this.timerRunning) this.toggleTimer(); });
      }
    } catch (e) {}
  },

  updateMediaSession() {
    try {
      if ('mediaSession' in navigator && navigator.mediaSession.metadata && this.timerRunning) {
        navigator.mediaSession.metadata.title = 'Отдых — ' + this._formatTimer(this.timerSeconds);
      }
    } catch (e) {}
  },

  stopMediaSession() {
    try {
      if (this._silentAudio) {
        this._silentAudio.pause();
        this._silentAudio.currentTime = 0;
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    } catch (e) {}
  },

  // ==================== ПЛАВАЮЩИЙ МИНИ-ТАЙМЕР ====================
  updateFloatingTimer() {
    const floating = document.getElementById('timer-floating');
    if (!floating) return;
    const onExercise = document.getElementById('screen-exercise').classList.contains('active');
    if (this.timerRunning && !onExercise) {
      floating.classList.remove('hidden');
      document.getElementById('timer-floating-time').textContent = this._formatTimer(this.timerSeconds);
      floating.classList.toggle('timer-float-warn', this.timerSeconds <= 10);
    } else {
      floating.classList.add('hidden');
    }
  },

  returnToTimer() {
    const ctx = this._timerContext;
    if (ctx && ctx.cycleId && ctx.week && ctx.day && ctx.exIndex !== null) {
      this.currentCycleId = ctx.cycleId;
      this.currentWeek = ctx.week;
      this.currentDay = ctx.day;
      this.currentExIndex = ctx.exIndex;
      this.showScreen('exercise');
      this.renderSets();
    }
  },

  _formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + s.toString().padStart(2, '0');
  },

  // Wake Lock — не гасить экран пока таймер работает
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this._wakeLock = await navigator.wakeLock.request('screen');
      } catch (e) {}
    }
  },

  releaseWakeLock() {
    if (this._wakeLock) {
      this._wakeLock.release().catch(() => {});
      this._wakeLock = null;
    }
  },

  // ==================== УПРАВЛЕНИЕ ТАЙМЕРОМ ====================
  adjustTimer(seconds) {
    this.timerSeconds = Math.max(0, this.timerSeconds + seconds);
    if (this.timerRunning) {
      this.timerEndAt = Date.now() + this.timerSeconds * 1000;
    } else {
      this.timerTarget = this.timerSeconds;
    }
    this.updateTimerDisplay();
  },

  editTimerManual() {
    document.getElementById('modal-timer-input').value = this.timerSeconds || '';
    document.getElementById('modal-timer').classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-timer-input').focus(), 100);
  },

  saveTimerManual() {
    const seconds = parseInt(document.getElementById('modal-timer-input').value) || 0;
    if (seconds < 0) return;

    this.timerSeconds = seconds;
    this.timerTarget = seconds;
    this.updateTimerDisplay();
    this.closeModal();
  },

  // ==================== ЭКРАН: ПРОГРЕСС ====================
  progressTab: 'overview',
  progressScope: 'cycle',
  exerciseFilter: 'all',
  expandedExercises: {},

  showProgress() {
    this.showScreen('progress');
    this.renderProgress();
  },

  setProgressTab(tab) {
    this.progressTab = tab;
    this.renderProgress();
  },

  setProgressScope(scope) {
    this.progressScope = scope;
    this.renderProgress();
  },

  setExerciseFilter(f) {
    this.exerciseFilter = f;
    this.renderProgress();
  },

  toggleExExpand(name) {
    this.expandedExercises[name] = !this.expandedExercises[name];
    this.renderProgress();
  },

  // Epley formula: 1RM = weight * (1 + reps / 30)
  calc1RM(weight, reps) {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
  },

  // Estimated 1RM from bench press data
  getEstimated1RM(cycles) {
    let best1RM = 0;
    cycles.forEach(cycle => {
      if (!cycle.workouts) return;
      PROGRAM.forEach(week => {
        week.days.forEach(day => {
          const key = `${week.week}-${day.day}`;
          const wo = cycle.workouts[key];
          if (!wo || !wo.exercises || wo.skipped) return;
          day.exercises.forEach((ex, idx) => {
            if (ex.isSpecial) return;
            const nm = ex.name.toLowerCase();
            if (!nm.includes('жим') || !(nm.includes('лежа') || nm.includes('штанг'))) return;
            const ed = wo.exercises[idx];
            if (!ed) return;
            if (ex.segments && !ex.isIndividual) {
              let sn = 0;
              ex.segments.forEach(seg => {
                for (let s = 0; s < seg.sets; s++) {
                  const ov = ed.setWeights && ed.setWeights[sn] !== undefined ? ed.setWeights[sn] : null;
                  const w = ov !== null ? ov : this.roundWeight(cycle.maxWeight * seg.percent / 100);
                  const done = ed.sets && ed.sets[sn] && ed.sets[sn].done;
                  if (done) {
                    const actualR = ed.sets[sn].actualReps !== undefined ? ed.sets[sn].actualReps : seg.reps;
                    const e1rm = this.calc1RM(w, actualR);
                    if (e1rm > best1RM) best1RM = e1rm;
                  }
                  sn++;
                }
              });
            }
          });
        });
      });
    });
    return best1RM;
  },

  getStreak(cycle) {
    if (!cycle.workouts) return 0;
    const allKeys = [];
    PROGRAM.forEach(week => {
      week.days.forEach(day => { allKeys.push(`${week.week}-${day.day}`); });
    });
    let streak = 0;
    let foundAny = false;
    for (let i = allKeys.length - 1; i >= 0; i--) {
      const wo = cycle.workouts[allKeys[i]];
      if (wo && wo.completed) {
        streak++;
        foundAny = true;
      } else if (foundAny) {
        break;
      } else if (wo && wo.exercises) {
        break;
      }
    }
    return streak;
  },

  getWeekComparison(cycle) {
    if (!cycle.workouts) return null;
    const weekData = [];
    PROGRAM.forEach(week => {
      let vol = 0, sets = 0;
      week.days.forEach(day => {
        const wo = cycle.workouts[`${week.week}-${day.day}`];
        if (!wo || !wo.exercises) return;
        day.exercises.forEach((ex, idx) => {
          if (ex.isSpecial) return;
          const ed = wo.exercises[idx];
          if (!ed) return;
          const sd = this.getExerciseSetData(ex, ed, cycle.maxWeight);
          vol += sd.vol;
          sets += sd.completedSets;
        });
      });
      if (vol > 0 || sets > 0) weekData.push({ week: week.week, vol: Math.round(vol), sets });
    });
    if (weekData.length < 2) return null;
    const last = weekData[weekData.length - 1];
    const prev = weekData[weekData.length - 2];
    const volDiff = last.vol - prev.vol;
    const volPercent = prev.vol > 0 ? Math.round((volDiff / prev.vol) * 100) : 0;
    return { lastWeek: last.week, prevWeek: prev.week, volDiff, volPercent, lastVol: last.vol, prevVol: prev.vol };
  },

  renderCircularProgress(percent, label, size) {
    const sz = size || 80;
    const r = (sz - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return `<div class="circular-progress" style="width:${sz}px;height:${sz}px">
      <svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">
        <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4"/>
        <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="4"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 ${sz/2} ${sz/2})" style="transition:stroke-dashoffset 0.6s"/>
      </svg>
      <div class="circular-progress-inner"><span class="circ-val">${percent}%</span><span class="circ-lbl">${label}</span></div>
    </div>`;
  },

  renderCalendar(cycle) {
    if (!cycle.workouts) return '<p style="color:var(--t3);text-align:center;font-size:12px">Нет данных</p>';
    let html = '<div class="cal-grid">';
    html += '<div class="cal-header">Нед</div>';
    ['Пн','Ср','Пт'].forEach(d => { html += `<div class="cal-header">${d}</div>`; });
    PROGRAM.forEach(week => {
      html += `<div class="cal-week-num">${week.week}</div>`;
      week.days.forEach(day => {
        const key = `${week.week}-${day.day}`;
        const wo = cycle.workouts[key];
        let cls = 'cal-cell';
        if (wo && wo.completed) cls += ' cal-done';
        else if (wo && wo.exercises) cls += ' cal-partial';
        else cls += ' cal-empty';
        html += `<div class="${cls}"></div>`;
      });
      for (let i = week.days.length; i < 3; i++) {
        html += '<div class="cal-cell cal-none"></div>';
      }
    });
    html += '</div>';
    return html;
  },

  renderProgress() {
    const container = document.getElementById('progress-content');
    const cycle = this.getCycle();
    const allCycles = this.data.cycles;
    const isCycleScope = this.progressScope === 'cycle';
    const cycles = isCycleScope ? [cycle] : allCycles;
    const tab = this.progressTab;

    // Scope toggle
    let html = `<div class="progress-tabs">
      <button class="progress-tab ${isCycleScope ? 'active' : ''}" onclick="App.setProgressScope('cycle')">Эта проходка</button>
      <button class="progress-tab ${!isCycleScope ? 'active' : ''}" onclick="App.setProgressScope('all')">Все проходки</button>
    </div>`;

    // Sub-tabs
    html += `<div class="progress-subtabs">
      <button class="sub-tab ${tab === 'overview' ? 'active' : ''}" onclick="App.setProgressTab('overview')">Обзор</button>
      <button class="sub-tab ${tab === 'charts' ? 'active' : ''}" onclick="App.setProgressTab('charts')">Графики</button>
      <button class="sub-tab ${tab === 'exercises' ? 'active' : ''}" onclick="App.setProgressTab('exercises')">Упражнения</button>
      <button class="sub-tab ${tab === 'records' ? 'active' : ''}" onclick="App.setProgressTab('records')">Рекорды</button>
    </div>`;

    if (!cycle || !cycle.workouts || (isCycleScope && Object.keys(cycle.workouts).length === 0)) {
      html += '<div class="empty-state"><h3>Пока нет данных</h3><p>Начни тренироваться, и здесь появится твой прогресс!</p></div>';
      container.innerHTML = html;
      return;
    }

    switch (tab) {
      case 'overview': html += this.renderOverviewTab(cycles, cycle); break;
      case 'charts': html += this.renderChartsTab(cycles, cycle); break;
      case 'exercises': html += this.renderExercisesTab(cycles); break;
      case 'records': html += this.renderRecordsTab(cycles); break;
    }

    container.innerHTML = html;
  },

  // ==================== ОБЗОР ====================
  renderOverviewTab(cycles, currentCycle) {
    let html = '';
    const isSingle = this.progressScope === 'cycle';

    // 1RM hero with sparkline (5.5)
    const est1RM = this.getEstimated1RM(cycles);
    const maxW = isSingle ? currentCycle.maxWeight : Math.max(...cycles.map(c => c.maxWeight));

    // Collect weekly best 1RM values for sparkline
    const weekly1RMVals = [];
    cycles.forEach(c => {
      if (!c.workouts) return;
      PROGRAM.forEach(week => {
        let best1rm = 0;
        week.days.forEach(day => {
          const wKey = `${week.week}-${day.day}`;
          const wo = c.workouts[wKey];
          if (!wo || !wo.exercises || wo.skipped) return;
          day.exercises.forEach((ex, idx) => {
            if (ex.isSpecial) return;
            const nm = ex.name.toLowerCase();
            if (!nm.includes('\u0436\u0438\u043c') || !(nm.includes('\u043b\u0435\u0436\u0430') || nm.includes('\u0448\u0442\u0430\u043d\u0433'))) return;
            const ed = wo.exercises[idx];
            if (!ed) return;
            if (ex.segments && !ex.isIndividual) {
              let sn = 0;
              ex.segments.forEach(seg => {
                for (let s = 0; s < seg.sets; s++) {
                  const ov = ed.setWeights && ed.setWeights[sn] !== undefined ? ed.setWeights[sn] : null;
                  const w = ov !== null ? ov : this.roundWeight(c.maxWeight * seg.percent / 100);
                  const done = ed.sets && ed.sets[sn] && ed.sets[sn].done;
                  if (done) {
                    const actualR = ed.sets[sn].actualReps !== undefined ? ed.sets[sn].actualReps : seg.reps;
                    const e1rm = this.calc1RM(w, actualR);
                    if (e1rm > best1rm) best1rm = e1rm;
                  }
                  sn++;
                }
              });
            }
          });
        });
        if (best1rm > 0) weekly1RMVals.push(best1rm);
      });
    });

    let heroSparkHtml = '';
    if (weekly1RMVals.length >= 2) {
      heroSparkHtml = `<div class="hero-sparkline">${this.renderSparkline(weekly1RMVals, { width: 160, height: 32 })}</div>`;
    }

    html += `<div class="overview-hero">
      <div class="hero-1rm">
        <div class="hero-1rm-val">${est1RM > 0 ? est1RM : maxW}</div>
        <div class="hero-1rm-label">${est1RM > 0 ? '\u0420\u0410\u0421\u0427\u0401\u0422\u041D\u042B\u0419 1RM' : '\u041C\u0410\u041A\u0421\u0418\u041C\u0423\u041C'} (\u043a\u0433)</div>
        ${heroSparkHtml}
        ${est1RM > 0 ? `<div class="hero-1rm-sub">\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044b\u0439 \u043c\u0430\u043a\u0441: ${maxW} \u043a\u0433</div>` : ''}
      </div>
    </div>`;

    // Stats row
    let totalWorkouts = 0, totalSets = 0, totalVolume = 0;
    cycles.forEach(c => {
      totalWorkouts += this.getCompletedWorkouts(c);
      totalSets += this.getTotalCompletedSets(c);
      totalVolume += this.getCycleTotalVolume(c);
    });
    html += `<div class="overview-stats">
      <div class="ov-stat"><span class="ov-stat-val">${totalWorkouts}</span><span class="ov-stat-lbl">тренировок</span></div>
      <div class="ov-stat"><span class="ov-stat-val">${totalSets}</span><span class="ov-stat-lbl">подходов</span></div>
      <div class="ov-stat"><span class="ov-stat-val">${totalVolume > 9999 ? (totalVolume / 1000).toFixed(1) + 'т' : totalVolume}</span><span class="ov-stat-lbl">объём (кг)</span></div>
    </div>`;

    // Circular progress + streak (cycle scope)
    if (isSingle) {
      const totalDays = this.getTotalWorkouts();
      const completedDays = this.getCompletedWorkouts(currentCycle);
      const percent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
      const streak = this.getStreak(currentCycle);
      html += `<div class="overview-row">
        <div class="overview-card">
          ${this.renderCircularProgress(percent, 'выполнено')}
          <div class="overview-card-sub">${completedDays} из ${totalDays} тренировок</div>
        </div>
        <div class="overview-card">
          <div class="streak-num">${streak}</div>
          <div class="streak-label">серия тренировок</div>
        </div>
      </div>`;
    }

    // Calendar heatmap
    if (isSingle) {
      html += `<div class="progress-section"><h3>\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043e\u043a</h3>${this.renderCalendar(currentCycle)}</div>`;
    }

    // 5.6 - Workout consistency stats
    {
      const workoutDates = [];
      cycles.forEach(c => {
        if (!c.workouts) return;
        Object.values(c.workouts).forEach(wo => {
          if (wo.date && (wo.completed || (wo.exercises && Object.keys(wo.exercises).length > 0)) && !wo.skipped) {
            workoutDates.push(new Date(wo.date));
          }
        });
      });
      workoutDates.sort((a, b) => a - b);
      if (workoutDates.length >= 2) {
        const gaps = [];
        for (let i = 1; i < workoutDates.length; i++) {
          const diffDays = Math.round((workoutDates[i] - workoutDates[i - 1]) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) gaps.push(diffDays);
        }
        const avgGap = gaps.length > 0 ? (gaps.reduce((s, g) => s + g, 0) / gaps.length).toFixed(1) : 0;
        const longestGap = gaps.length > 0 ? Math.max(...gaps) : 0;
        html += `<div class="progress-section"><h3>\u0420\u0435\u0433\u0443\u043b\u044f\u0440\u043d\u043e\u0441\u0442\u044c</h3>
          <div class="consistency-stats">
            <div class="consist-item"><span class="consist-val">${workoutDates.length}</span><span class="consist-lbl">\u0434\u043d\u0435\u0439 \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043e\u043a</span></div>
            <div class="consist-item"><span class="consist-val">${avgGap}</span><span class="consist-lbl">\u0441\u0440. \u0434\u043d\u0435\u0439 \u043c\u0435\u0436\u0434\u0443</span></div>
            <div class="consist-item"><span class="consist-val">${longestGap}</span><span class="consist-lbl">\u043c\u0430\u043a\u0441. \u043f\u0435\u0440\u0435\u0440\u044b\u0432</span></div>
          </div>
        </div>`;
      }
    }

    // 5.7 - Rep range analysis
    {
      const ranges = { heavy: { sets: 0, totalW: 0 }, strength: { sets: 0, totalW: 0 }, hypertrophy: { sets: 0, totalW: 0 }, endurance: { sets: 0, totalW: 0 } };
      cycles.forEach(c => {
        if (!c.workouts) return;
        PROGRAM.forEach(week => {
          week.days.forEach(day => {
            const key = `${week.week}-${day.day}`;
            const wo = c.workouts[key];
            if (!wo || !wo.exercises || wo.skipped) return;
            day.exercises.forEach((ex, idx) => {
              if (ex.isSpecial || ex.isBodyweight) return;
              const ed = wo.exercises[idx];
              if (!ed) return;
              if (ex.segments && !ex.isIndividual) {
                let sn = 0;
                ex.segments.forEach(seg => {
                  const calcW = this.roundWeight(c.maxWeight * seg.percent / 100);
                  for (let s = 0; s < seg.sets; s++) {
                    const done = ed.sets && ed.sets[sn] && ed.sets[sn].done;
                    if (done) {
                      const ov = ed.setWeights && ed.setWeights[sn] !== undefined ? ed.setWeights[sn] : null;
                      const w = ov !== null ? ov : calcW;
                      const actualR = ed.sets[sn].actualReps !== undefined ? ed.sets[sn].actualReps : seg.reps;
                      const bucket = actualR <= 3 ? 'heavy' : actualR <= 6 ? 'strength' : actualR <= 10 ? 'hypertrophy' : 'endurance';
                      ranges[bucket].sets++;
                      ranges[bucket].totalW += w;
                    }
                    sn++;
                  }
                });
              } else if (ex.isIndividual) {
                for (let i = 0; i < ex.sets; i++) {
                  const done = ed.sets && ed.sets[i] && ed.sets[i].done;
                  if (done) {
                    const w = ed.setWeights && ed.setWeights[i] !== undefined ? ed.setWeights[i] : (ed.weight || 0);
                    const actualR = ed.sets && ed.sets[i] && ed.sets[i].actualReps !== undefined ? ed.sets[i].actualReps : ex.reps;
                    const bucket = actualR <= 3 ? 'heavy' : actualR <= 6 ? 'strength' : actualR <= 10 ? 'hypertrophy' : 'endurance';
                    ranges[bucket].sets++;
                    ranges[bucket].totalW += w;
                  }
                }
              }
            });
          });
        });
      });
      const totalSetsRange = ranges.heavy.sets + ranges.strength.sets + ranges.hypertrophy.sets + ranges.endurance.sets;
      if (totalSetsRange > 0) {
        const rangeItems = [
          { key: 'heavy', label: '1-3 (\u0441\u0438\u043b\u0430)', data: ranges.heavy },
          { key: 'strength', label: '4-6 (\u0441\u0438\u043b\u043e\u0432\u044b\u0435)', data: ranges.strength },
          { key: 'hypertrophy', label: '7-10 (\u0433\u0438\u043f\u0435\u0440\u0442\u0440.)', data: ranges.hypertrophy },
          { key: 'endurance', label: '11+ (\u0432\u044b\u043d\u043e\u0441\u043b.)', data: ranges.endurance }
        ];
        html += `<div class="progress-section"><h3>\u0414\u0438\u0430\u043f\u0430\u0437\u043e\u043d\u044b \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u0439</h3><div class="rep-range-grid">`;
        rangeItems.forEach(item => {
          const pct = totalSetsRange > 0 ? Math.round((item.data.sets / totalSetsRange) * 100) : 0;
          const avgW = item.data.sets > 0 ? Math.round(item.data.totalW / item.data.sets * 10) / 10 : 0;
          html += `<div class="rep-range-item">
            <div class="rep-range-bar-bg"><div class="rep-range-bar-fill" style="height:${pct}%"></div></div>
            <div class="rep-range-val">${item.data.sets}</div>
            <div class="rep-range-lbl">${item.label}</div>
            ${avgW > 0 ? `<div class="rep-range-avg">${avgW} \u043a\u0433</div>` : ''}
          </div>`;
        });
        html += `</div></div>`;
      }
    }

    // 5.9 - Skipped workout analysis
    {
      const skippedList = [];
      cycles.forEach(c => {
        if (!c.workouts) return;
        PROGRAM.forEach(week => {
          week.days.forEach(day => {
            const key = `${week.week}-${day.day}`;
            const wo = c.workouts[key];
            if (wo && wo.skipped) {
              skippedList.push({
                cycleName: c.name,
                week: week.week,
                day: day.day,
                reason: wo.skipReason || ''
              });
            }
          });
        });
      });
      if (skippedList.length > 0) {
        const showCycleLabel = cycles.length > 1;
        html += `<div class="progress-section"><h3>\u041f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043d\u044b\u0435 \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438 (${skippedList.length})</h3>`;
        skippedList.forEach(sk => {
          const cycleLabel = showCycleLabel ? `<span class="skip-an-cycle">${this.escapeHtml(sk.cycleName)}</span> ` : '';
          html += `<div class="skip-analysis-row">
            <span class="skip-an-when">${cycleLabel}\u041d\u0435\u0434.${sk.week} ${sk.day}</span>
            <span class="skip-an-reason">${sk.reason ? this.escapeHtml(sk.reason) : '\u2014'}</span>
          </div>`;
        });
        html += '</div>';
      }
    }

    // Week comparison
    if (isSingle) {
      const cmp = this.getWeekComparison(currentCycle);
      if (cmp) {
        const arrow = cmp.volDiff > 0 ? '&#9650;' : cmp.volDiff < 0 ? '&#9660;' : '&#9644;';
        const cls = cmp.volDiff > 0 ? 'cmp-up' : cmp.volDiff < 0 ? 'cmp-down' : 'cmp-same';
        html += `<div class="progress-section"><h3>Сравнение недель</h3>
          <div class="week-cmp">
            <div class="cmp-block"><div class="cmp-week">Неделя ${cmp.prevWeek}</div><div class="cmp-vol">${cmp.prevVol > 999 ? (cmp.prevVol/1000).toFixed(1)+'т' : cmp.prevVol} кг</div></div>
            <div class="cmp-arrow ${cls}"><span>${arrow}</span><span class="cmp-pct">${cmp.volPercent > 0 ? '+' : ''}${cmp.volPercent}%</span></div>
            <div class="cmp-block"><div class="cmp-week">Неделя ${cmp.lastWeek}</div><div class="cmp-vol">${cmp.lastVol > 999 ? (cmp.lastVol/1000).toFixed(1)+'т' : cmp.lastVol} кг</div></div>
          </div>
        </div>`;
      }
    }

    // Per-cycle list (all scope)
    if (!isSingle && cycles.length > 1) {
      html += '<div class="progress-section"><h3>Проходки</h3>';
      cycles.forEach(c => {
        const completed = this.getCompletedWorkouts(c);
        const total = this.getTotalWorkouts();
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        html += `<div class="progress-bar-container">
          <div class="progress-bar-label"><span>${this.escapeHtml(c.name)} <small style="color:var(--accent)">${c.maxWeight} кг</small></span><span>${pct}%</span></div>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      });
      html += '</div>';
    }

    return html;
  },

  // ==================== ГРАФИКИ ====================
  renderChartsTab(cycles, currentCycle) {
    let html = '';
    const isSingle = this.progressScope === 'cycle';

    if (isSingle) {
      const weeklyVolData = [], weeklyMaxData = [], weeklyCompData = [], weekly1RMData = [];
      PROGRAM.forEach(week => {
        let vol = 0, mxW = 0, doneSets = 0, totalSetsW = 0, best1rm = 0;
        week.days.forEach(day => {
          const wKey = `${week.week}-${day.day}`;
          const wo = currentCycle.workouts[wKey];
          if (!wo || !wo.exercises || wo.skipped) return;
          day.exercises.forEach((ex, idx) => {
            if (ex.isSpecial) return;
            const ed = wo.exercises[idx];
            if (!ed) return;
            if (ex.segments && !ex.isIndividual) {
              let sn = 0;
              ex.segments.forEach(seg => {
                const cW = this.roundWeight(currentCycle.maxWeight * seg.percent / 100);
                for (let s = 0; s < seg.sets; s++) {
                  totalSetsW++;
                  const ov = ed.setWeights && ed.setWeights[sn] !== undefined ? ed.setWeights[sn] : null;
                  const wt = ov !== null ? ov : cW;
                  const dn = ed.sets && ed.sets[sn] && ed.sets[sn].done;
                  if (dn) {
                    vol += wt * seg.reps;
                    doneSets++;
                    if (wt > mxW) mxW = wt;
                    const nm = ex.name.toLowerCase();
                    if (nm.includes('жим') && (nm.includes('лежа') || nm.includes('штанг'))) {
                      const e1rm = this.calc1RM(wt, seg.reps);
                      if (e1rm > best1rm) best1rm = e1rm;
                    }
                  }
                  sn++;
                }
              });
            } else if (ex.isIndividual) {
              for (let i = 0; i < ex.sets; i++) {
                totalSetsW++;
                const wt = ed.setWeights && ed.setWeights[i] !== undefined ? ed.setWeights[i] : (ed.weight || 0);
                const dn = ed.sets && ed.sets[i] && ed.sets[i].done;
                if (dn) { vol += wt * ex.reps; doneSets++; if (wt > mxW) mxW = wt; }
              }
            } else if (ex.isBodyweight) {
              for (let i = 0; i < ex.sets; i++) {
                totalSetsW++;
                if (ed.sets && ed.sets[i] && ed.sets[i].done) doneSets++;
              }
            }
          });
        });
        if (vol > 0) weeklyVolData.push({ label: '\u041D' + week.week, value: Math.round(vol) });
        if (mxW > 0) weeklyMaxData.push({ label: '\u041D' + week.week, value: mxW });
        if (totalSetsW > 0) weeklyCompData.push({ label: '\u041D' + week.week, value: Math.round((doneSets / totalSetsW) * 100) });
        if (best1rm > 0) weekly1RMData.push({ label: '\u041D' + week.week, value: Math.round(best1rm * 10) / 10 });
      });

      if (weekly1RMData.length >= 2) {
        html += `<div class="chart-container"><div class="chart-title">Расчётный 1RM по неделям (кг)</div>${this.renderSvgLineChart(weekly1RMData)}</div>`;
      }
      if (weeklyMaxData.length >= 2) {
        html += `<div class="chart-container"><div class="chart-title">Макс. вес по неделям (кг)</div>${this.renderSvgLineChart(weeklyMaxData)}</div>`;
      }
      if (weeklyVolData.length >= 2) {
        html += `<div class="chart-container"><div class="chart-title">Объём по неделям (кг)</div>${this.renderSvgBarChart(weeklyVolData)}</div>`;
      }
      if (weeklyCompData.length >= 2) {
        html += `<div class="chart-container"><div class="chart-title">Выполнение по неделям (%)</div>${this.renderSvgLineChart(weeklyCompData, { height: 130 })}</div>`;
      }

      // Week progress bars
      html += '<div class="progress-section"><h3>Прогресс по неделям</h3>';
      PROGRAM.forEach(week => {
        const weekWorkouts = week.days.length;
        let weekCompleted = 0;
        week.days.forEach(day => {
          const key = `${week.week}-${day.day}`;
          if (currentCycle.workouts[key] && currentCycle.workouts[key].completed) weekCompleted++;
        });
        const percent = Math.round((weekCompleted / weekWorkouts) * 100);
        html += `<div class="progress-bar-container">
          <div class="progress-bar-label"><span>Неделя ${week.week}</span><span>${weekCompleted}/${weekWorkouts}</span></div>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
        </div>`;
      });
      html += '</div>';
    } else {
      // Cross-cycle charts
      const allCycles = cycles;
      if (allCycles.length >= 1) {
        const cycleMaxData = allCycles.map(c => ({
          label: c.name.length > 6 ? c.name.substring(0, 6) + '..' : c.name,
          value: c.maxWeight
        }));
        if (cycleMaxData.length >= 2) {
          html += `<div class="chart-container"><div class="chart-title">Максимум жима по проходкам (кг)</div>${this.renderSvgLineChart(cycleMaxData)}</div>`;
        } else {
          html += `<div class="chart-container"><div class="chart-title">Максимум жима по проходкам (кг)</div>${this.renderSvgBarChart(cycleMaxData)}</div>`;
        }

        // 1RM by cycle
        const cycle1RMData = allCycles.map(c => ({
          label: c.name.length > 6 ? c.name.substring(0, 6) + '..' : c.name,
          value: this.getEstimated1RM([c])
        })).filter(d => d.value > 0);
        if (cycle1RMData.length >= 2) {
          html += `<div class="chart-container"><div class="chart-title">Расчётный 1RM по проходкам (кг)</div>${this.renderSvgLineChart(cycle1RMData)}</div>`;
        }

        const cycleVolData = allCycles.map(c => ({
          label: c.name.length > 6 ? c.name.substring(0, 6) + '..' : c.name,
          value: this.getCycleTotalVolume(c)
        })).filter(d => d.value > 0);
        if (cycleVolData.length > 0) {
          html += `<div class="chart-container"><div class="chart-title">Объём по проходкам (кг)</div>${this.renderSvgBarChart(cycleVolData)}</div>`;
        }

        const cycleSetsData = allCycles.map(c => ({
          label: c.name.length > 6 ? c.name.substring(0, 6) + '..' : c.name,
          value: this.getTotalCompletedSets(c)
        })).filter(d => d.value > 0);
        if (cycleSetsData.length >= 2) {
          html += `<div class="chart-container"><div class="chart-title">Подходов по проходкам</div>${this.renderSvgBarChart(cycleSetsData, { color: '#ffffff' })}</div>`;
        }
      }
    }

    if (!html) {
      html = '<div class="empty-state"><p>Недостаточно данных для графиков. Завершите минимум 2 тренировки.</p></div>';
    }

    return html;
  },

  // ==================== УПРАЖНЕНИЯ ====================
  renderExercisesTab(cycles) {
    const history = this.collectFullHistory(cycles);
    const showCycle = this.progressScope === 'all' && cycles.length > 1;

    // Filter buttons
    let html = `<div class="ex-filter-row">
      <button class="ex-filter ${this.exerciseFilter === 'all' ? 'active' : ''}" onclick="App.setExerciseFilter('all')">Все</button>
      <button class="ex-filter ${this.exerciseFilter === 'base' ? 'active' : ''}" onclick="App.setExerciseFilter('base')">Базовые</button>
      <button class="ex-filter ${this.exerciseFilter === 'individual' ? 'active' : ''}" onclick="App.setExerciseFilter('individual')">Инд. вес</button>
      <button class="ex-filter ${this.exerciseFilter === 'bodyweight' ? 'active' : ''}" onclick="App.setExerciseFilter('bodyweight')">Своё тело</button>
    </div>`;

    html += this.renderExerciseStats(history, showCycle);
    return html;
  },

  // ==================== РЕКОРДЫ ====================
  renderRecordsTab(cycles) {
    const history = this.collectFullHistory(cycles);
    let html = '';

    // 1RM Board (Epley)
    const rm1Board = [];
    for (const [name, data] of Object.entries(history)) {
      if (data.isBodyweight) continue;
      let best1RM = 0, bestWeight = 0, bestReps = 0;
      data.records.forEach(r => {
        // Per-set 1RM: check each weight×reps pair individually
        r.weights.forEach((w, i) => {
          if (w <= 0) return;
          const reps = r.reps > 0 && r.completedSets > 0 ? Math.round(r.reps / r.completedSets) : 1;
          const e1rm = this.calc1RM(w, reps);
          if (e1rm > best1RM) { best1RM = e1rm; bestWeight = w; bestReps = reps; }
        });
        if (r.maxWeight > 0 && r.completedSets > 0) {
          const e1rm = this.calc1RM(r.maxWeight, 1);
          if (e1rm > best1RM) { best1RM = e1rm; bestWeight = r.maxWeight; bestReps = 1; }
        }
      });
      if (best1RM > 0) rm1Board.push({ name, best1RM, bestWeight, bestReps, isBase: data.isBase });
    }
    rm1Board.sort((a, b) => b.best1RM - a.best1RM);

    if (rm1Board.length > 0) {
      html += '<div class="progress-section"><h3>Расчётный 1RM (Epley)</h3>';
      rm1Board.forEach((item, i) => {
        const badge = item.isBase ? '<span class="stat-type-badge base" style="margin-left:6px;vertical-align:middle">Б</span>' : '';
        html += `<div class="pr-row">
          <span class="pr-rank">${i + 1}</span>
          <span class="pr-name">${item.name}${badge}</span>
          <span class="pr-val">${item.best1RM} кг</span>
        </div>`;
      });
      html += '</div>';
    }

    // PR Board - max weight per exercise
    const prBoard = [];
    for (const [name, data] of Object.entries(history)) {
      if (data.isBodyweight) continue;
      const allMax = data.records.map(r => r.maxWeight).filter(w => w > 0);
      if (allMax.length === 0) continue;
      prBoard.push({ name, pr: Math.max(...allMax), isBase: data.isBase });
    }
    prBoard.sort((a, b) => b.pr - a.pr);

    if (prBoard.length > 0) {
      html += '<div class="progress-section"><h3>Персональные рекорды (макс. вес)</h3>';
      prBoard.forEach((item, i) => {
        const badge = item.isBase ? '<span class="stat-type-badge base" style="margin-left:6px;vertical-align:middle">Б</span>' : '';
        html += `<div class="pr-row">
          <span class="pr-rank">${i + 1}</span>
          <span class="pr-name">${item.name}${badge}</span>
          <span class="pr-val accent">${item.pr} кг</span>
        </div>`;
      });
      html += '</div>';
    }

    // Best volume per workout
    const volBoard = [];
    for (const [name, data] of Object.entries(history)) {
      if (data.isBodyweight) continue;
      let bestVol = 0, bestRec = null;
      data.records.forEach(r => {
        if (r.vol > bestVol) { bestVol = r.vol; bestRec = r; }
      });
      if (bestVol > 0) volBoard.push({ name, vol: bestVol, rec: bestRec });
    }
    volBoard.sort((a, b) => b.vol - a.vol);

    if (volBoard.length > 0) {
      html += '<div class="progress-section"><h3>Лучший объём за тренировку</h3>';
      volBoard.slice(0, 10).forEach((item, i) => {
        html += `<div class="pr-row">
          <span class="pr-rank">${i + 1}</span>
          <span class="pr-name">${item.name}</span>
          <span class="pr-val">${item.vol > 999 ? (item.vol / 1000).toFixed(1) + 'т' : item.vol} кг</span>
        </div>`;
      });
      html += '</div>';
    }

    // Bodyweight records
    const bwBoard = [];
    for (const [name, data] of Object.entries(history)) {
      if (!data.isBodyweight) continue;
      const totalReps = data.records.reduce((s, r) => s + r.reps, 0);
      if (totalReps > 0) bwBoard.push({ name, totalReps });
    }
    bwBoard.sort((a, b) => b.totalReps - a.totalReps);

    if (bwBoard.length > 0) {
      html += '<div class="progress-section"><h3>Своё тело (повторения)</h3>';
      bwBoard.forEach((item, i) => {
        html += `<div class="pr-row">
          <span class="pr-rank">${i + 1}</span>
          <span class="pr-name">${item.name}</span>
          <span class="pr-val">${item.totalReps} повт.</span>
        </div>`;
      });
      html += '</div>';
    }

    if (!html) {
      html = '<div class="empty-state"><p>Нет данных для рекордов</p></div>';
    }
    return html;
  },

  // ==================== СБОР ИСТОРИИ ====================
  collectFullHistory(cycles) {
    const history = {};

    cycles.forEach(cycle => {
      if (!cycle.workouts) return;

      PROGRAM.forEach(week => {
        week.days.forEach(day => {
          const key = `${week.week}-${day.day}`;
          const workout = cycle.workouts[key];
          if (!workout || !workout.exercises || workout.skipped) return;

          day.exercises.forEach((ex, idx) => {
            if (ex.isSpecial) return;
            const exData = workout.exercises[idx];
            if (!exData) return;

            const name = ex.name;
            if (!history[name]) {
              history[name] = {
                isBase: !!ex.isBase,
                isBodyweight: !!ex.isBodyweight,
                isIndividual: !!ex.isIndividual,
                records: []
              };
            }

            const sd = this.getExerciseSetData(ex, exData, cycle.maxWeight);

            if (sd.completedSets > 0) {
              history[name].records.push({
                cycleName: cycle.name,
                cycleMax: cycle.maxWeight,
                week: week.week,
                day: day.day,
                maxWeight: sd.maxWeight,
                weights: sd.weights.filter(w => w > 0),
                completedSets: sd.completedSets,
                totalSets: sd.totalSets,
                vol: sd.vol,
                reps: sd.reps
              });
            }
          });
        });
      });
    });

    return history;
  },

  // ==================== КАРТОЧКИ УПРАЖНЕНИЙ ====================
  renderExerciseStats(history, showCycle) {
    let html = '';
    const filter = this.exerciseFilter;

    const entries = Object.entries(history).sort((a, b) => {
      const order = d => d.isBase ? 0 : d.isIndividual ? 1 : 2;
      return order(a[1]) - order(b[1]);
    }).filter(([name, data]) => {
      if (filter === 'all') return true;
      if (filter === 'base') return data.isBase;
      if (filter === 'individual') return data.isIndividual;
      if (filter === 'bodyweight') return data.isBodyweight;
      return true;
    });

    for (const [name, data] of entries) {
      if (data.records.length === 0) continue;

      const isExpanded = this.expandedExercises[name];
      const hasWeight = !data.isBodyweight;
      const allMax = data.records.map(r => r.maxWeight).filter(w => w > 0);
      const pr = allMax.length > 0 ? Math.max(...allMax) : 0;
      const lastW = allMax.length > 0 ? allMax[allMax.length - 1] : 0;
      const firstW = allMax.length > 0 ? allMax[0] : 0;
      const totalVol = data.records.reduce((s, r) => s + r.vol, 0);
      const totalReps = data.records.reduce((s, r) => s + r.reps, 0);
      const doneAll = data.records.reduce((s, r) => s + r.completedSets, 0);
      const setsAll = data.records.reduce((s, r) => s + r.totalSets, 0);
      const rate = setsAll > 0 ? Math.round((doneAll / setsAll) * 100) : 0;

      // Trend
      let trendHtml = '';
      if (hasWeight && allMax.length >= 2) {
        const diff = lastW - firstW;
        if (diff > 0) trendHtml = `<span class="stat-trend trend-up">+${diff}</span>`;
        else if (diff < 0) trendHtml = `<span class="stat-trend trend-down">${diff}</span>`;
        else trendHtml = `<span class="stat-trend trend-same">=</span>`;
      }

      // Type badge
      let typeBadge = '';
      if (data.isBase) typeBadge = '<span class="stat-type-badge base">Базовое</span>';
      else if (data.isIndividual) typeBadge = '<span class="stat-type-badge individual">Инд. вес</span>';
      else typeBadge = '<span class="stat-type-badge bodyweight">Своё тело</span>';

      let prBadge = '';
      if (hasWeight && pr > 0) prBadge = `<span class="pr-badge">PR ${pr} кг</span>`;

      const safeName = name.replace(/'/g, "\\'");
      html += `<div class="exercise-stat-card ${isExpanded ? 'expanded' : 'collapsed'}">`;
      html += `<div class="stat-card-header" onclick="App.toggleExExpand('${safeName}')">
        <div class="stat-card-name">${name} ${trendHtml}</div>
        <div class="stat-card-badges">${typeBadge}${prBadge}</div>
        <span class="expand-arrow">${isExpanded ? '&#9650;' : '&#9660;'}</span>
      </div>`;

      // Summary line (always visible)
      html += `<div class="stat-card-summary">`;
      if (hasWeight && pr > 0) {
        html += `<span>${lastW} кг</span><span class="summary-dot">&middot;</span>`;
      }
      html += `<span>${doneAll} подх.</span><span class="summary-dot">&middot;</span><span>${rate}%</span>`;
      html += `</div>`;

      if (isExpanded) {
        // Full metrics
        html += `<div class="stat-card-metrics">`;
        if (hasWeight && pr > 0) {
          html += `<div class="metric"><span class="metric-val">${lastW}</span><span class="metric-lbl">Последний</span></div>`;
          html += `<div class="metric"><span class="metric-val">${totalVol > 999 ? (totalVol / 1000).toFixed(1) + 'т' : totalVol}</span><span class="metric-lbl">Объём кг</span></div>`;
        }
        if (!hasWeight) {
          html += `<div class="metric"><span class="metric-val">${totalReps}</span><span class="metric-lbl">Повторений</span></div>`;
        }
        html += `<div class="metric"><span class="metric-val">${doneAll}</span><span class="metric-lbl">Подходов</span></div>`;
        html += `<div class="metric"><span class="metric-val">${rate}%</span><span class="metric-lbl">Выполн.</span></div>`;
        html += `</div>`;

        // 1RM estimate
        if (hasWeight && pr > 0) {
          const approxReps = totalReps > 0 && doneAll > 0 ? Math.round(totalReps / doneAll) : 1;
          const e1rm = this.calc1RM(pr, approxReps);
          if (e1rm > pr) {
            html += `<div class="stat-1rm-row"><span class="stat-1rm-label">\u0420\u0430\u0441\u0447\u0451\u0442\u043d\u044b\u0439 1RM:</span><span class="stat-1rm-val">${e1rm} \u043a\u0433</span></div>`;
          }
        }

        // 5.2 - Per-exercise 1RM progression line chart
        if (hasWeight && data.records.length >= 2) {
          const per1RMData = data.records.map(r => {
            let best = 0;
            r.weights.forEach((w, i) => {
              if (w <= 0) return;
              const avgReps = r.reps > 0 && r.completedSets > 0 ? Math.round(r.reps / r.completedSets) : 1;
              const e = this.calc1RM(w, avgReps);
              if (e > best) best = e;
            });
            if (r.maxWeight > 0) {
              const e = this.calc1RM(r.maxWeight, 1);
              if (e > best) best = e;
            }
            return { label: '\u041d' + r.week + ' ' + r.day, value: Math.round(best * 10) / 10 };
          }).filter(d => d.value > 0);

          if (per1RMData.length >= 2) {
            const first1rm = per1RMData[0].value;
            const last1rm = per1RMData[per1RMData.length - 1].value;
            const diff1rm = last1rm - first1rm;
            const diffStr1rm = diff1rm > 0 ? '+' + diff1rm.toFixed(1) : diff1rm.toFixed(1);
            const trendCol = diff1rm >= 0 ? 'var(--accent)' : '#ff3b30';
            html += `<div class="ex-1rm-chart-section">
              <div class="ex-1rm-chart-header">
                <span>1RM \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0438\u044f</span>
                <span style="color:${trendCol};font-family:Oswald;font-weight:600;font-size:12px">${diffStr1rm} \u043a\u0433</span>
              </div>
              <div class="ex-1rm-chart-wrap">${this.renderSvgLineChart(per1RMData, { height: 100 })}</div>
            </div>`;
          }
        }

        // Sparkline
        const sparkW = data.records.map(r => r.maxWeight).filter(w => w > 0);
        if (sparkW.length >= 2) {
          const sparkMin = Math.min(...sparkW);
          const sparkMax = Math.max(...sparkW);
          html += `<div class="sparkline-row"><span class="sparkline-label">${sparkMin}</span><div class="sparkline-wrap">${this.renderSparkline(sparkW, { width: 200, height: 36 })}</div><span class="sparkline-label">${sparkMax}</span></div>`;
        } else if (!data.isBodyweight) {
          const sparkR = data.records.map(r => r.reps).filter(r => r > 0);
          if (sparkR.length >= 2) {
            html += `<div class="sparkline-row"><span class="sparkline-label">${Math.min(...sparkR)}</span><div class="sparkline-wrap">${this.renderSparkline(sparkR, { width: 200, height: 36, color: '#ffffff' })}</div><span class="sparkline-label">${Math.max(...sparkR)}</span></div>`;
          }
        }

        // History
        html += `<div class="stat-history">`;
        data.records.forEach(r => {
          const cycleStr = showCycle ? `<span class="hist-cycle">${this.escapeHtml(r.cycleName)}</span> ` : '';
          let weightsStr = '';
          if (r.weights.length > 0) {
            const unique = [...new Set(r.weights)].sort((a, b) => a - b);
            weightsStr = unique.join('/') + ' кг';
          } else {
            weightsStr = 'б/в';
          }
          const allDone = r.completedSets >= r.totalSets;
          html += `<div class="stat-history-row"><span class="hist-date">${cycleStr}Нед.${r.week} ${r.day}</span><span class="hist-weight">${weightsStr}</span><span class="hist-sets ${allDone ? 'all-done' : ''}">${r.completedSets}/${r.totalSets}</span></div>`;
        });
        html += `</div>`;
      }

      html += `</div>`;
    }

    if (!html) {
      html = '<p style="color:var(--t3);text-align:center;padding:20px;">Нет данных по упражнениям</p>';
    }

    return html;
  },

  getCycleTotalVolume(cycle) {
    let vol = 0;
    if (!cycle.workouts) return 0;

    PROGRAM.forEach(week => {
      week.days.forEach(day => {
        const key = `${week.week}-${day.day}`;
        const workout = cycle.workouts[key];
        if (!workout || !workout.exercises) return;

        day.exercises.forEach((ex, idx) => {
          if (ex.isSpecial) return;
          const exData = workout.exercises[idx];
          if (!exData) return;
          vol += this.getExerciseSetData(ex, exData, cycle.maxWeight).vol;
        });
      });
    });

    return Math.round(vol);
  },

  getTotalCompletedSets(cycle) {
    let total = 0;
    if (!cycle.workouts) return 0;

    Object.values(cycle.workouts).forEach(workout => {
      if (!workout.exercises) return;
      Object.values(workout.exercises).forEach(ex => {
        total += ex.completedSets || 0;
        if (ex.superset) total += ex.superset.completedSets || 0;
      });
    });

    return total;
  },

  // ==================== ГРАФИКИ (SVG) ====================
  renderSvgLineChart(data, options = {}) {
    if (data.length < 2) return '';
    const id = ++this._chartId;
    const w = 320, h = options.height || 160;
    const pad = { t: 22, r: 12, b: 28, l: 40 };
    const cW = w - pad.l - pad.r, cH = h - pad.t - pad.b;
    const c = '#CDFF00';
    const vals = data.map(d => d.value);
    const maxV = Math.max(...vals), minV = Math.min(...vals);
    const range = maxV - minV || 1;
    const aMin = minV - range * 0.08, aMax = maxV + range * 0.15;
    const aR = aMax - aMin;
    const sx = i => pad.l + (i / (data.length - 1)) * cW;
    const sy = v => pad.t + cH - ((v - aMin) / aR) * cH;

    let svg = `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;
    svg += `<defs><linearGradient id="lg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c}" stop-opacity="0.25"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>`;

    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i;
      const v = aMax - (aR / 4) * i;
      svg += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>`;
      svg += `<text x="${pad.l - 5}" y="${y + 3}" fill="rgba(255,255,255,0.25)" font-size="9" font-family="Oswald,sans-serif" text-anchor="end">${Math.round(v)}</text>`;
    }

    const pts = data.map((d, i) => ({ x: sx(i), y: sy(d.value) }));
    let lineD = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i-1].x + pts[i].x) / 2;
      lineD += ` C${cpx.toFixed(1)},${pts[i-1].y.toFixed(1)} ${cpx.toFixed(1)},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
    }
    const areaD = lineD + ` L${pts[pts.length-1].x.toFixed(1)},${pad.t + cH} L${pts[0].x.toFixed(1)},${pad.t + cH} Z`;
    svg += `<path d="${areaD}" fill="url(#lg${id})"/>`;
    svg += `<path d="${lineD}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

    pts.forEach((p, i) => {
      svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${c}" stroke="#000" stroke-width="1.5"/>`;
      svg += `<text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" fill="rgba(255,255,255,0.65)" font-size="9" font-family="Oswald,sans-serif" text-anchor="middle">${data[i].value}</text>`;
    });

    const skip = data.length > 9 ? Math.ceil(data.length / 7) : 1;
    data.forEach((d, i) => {
      if (i % skip === 0 || i === data.length - 1) {
        svg += `<text x="${sx(i).toFixed(1)}" y="${h - 6}" fill="rgba(255,255,255,0.25)" font-size="9" text-anchor="middle">${d.label}</text>`;
      }
    });
    svg += '</svg>';
    return svg;
  },

  renderSvgBarChart(data, options = {}) {
    if (data.length === 0) return '';
    const id = ++this._chartId;
    const w = 320, h = options.height || 160;
    const pad = { t: 20, r: 12, b: 28, l: 40 };
    const cW = w - pad.l - pad.r, cH = h - pad.t - pad.b;
    const c = options.color || '#CDFF00';
    const maxV = Math.max(...data.map(d => d.value)) * 1.18 || 1;
    const barW = Math.min(30, (cW / data.length) * 0.6);
    const gap = (cW - barW * data.length) / (data.length + 1);

    let svg = `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;
    svg += `<defs><linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c}"/><stop offset="100%" stop-color="${c}" stop-opacity="0.35"/></linearGradient></defs>`;

    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i;
      const v = maxV - (maxV / 4) * i;
      svg += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>`;
      if (i < 4) svg += `<text x="${pad.l - 5}" y="${y + 3}" fill="rgba(255,255,255,0.25)" font-size="9" font-family="Oswald,sans-serif" text-anchor="end">${v > 999 ? (v/1000).toFixed(1) + 'т' : Math.round(v)}</text>`;
    }

    data.forEach((d, i) => {
      const x = pad.l + gap + i * (barW + gap);
      const bH = Math.max(2, (d.value / maxV) * cH);
      const y = pad.t + cH - bH;
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${bH.toFixed(1)}" rx="3" fill="url(#bg${id})"/>`;
      svg += `<text x="${(x + barW/2).toFixed(1)}" y="${(y - 4).toFixed(1)}" fill="rgba(255,255,255,0.55)" font-size="8" font-family="Oswald,sans-serif" text-anchor="middle">${d.value > 999 ? (d.value/1000).toFixed(1) + 'т' : d.value}</text>`;
      svg += `<text x="${(x + barW/2).toFixed(1)}" y="${h - 6}" fill="rgba(255,255,255,0.25)" font-size="8" text-anchor="middle">${d.label}</text>`;
    });
    svg += '</svg>';
    return svg;
  },

  renderSparkline(values, options = {}) {
    if (values.length < 2) return '';
    const w = options.width || 120, h = options.height || 32;
    const c = options.color || '#CDFF00';
    const p = 3;
    const maxV = Math.max(...values), minV = Math.min(...values);
    const range = maxV - minV || 1;
    const sx = i => p + (i / (values.length - 1)) * (w - p * 2);
    const sy = v => p + (h - p * 2) - ((v - minV) / range) * (h - p * 2);

    let lineD = `M${sx(0).toFixed(1)},${sy(values[0]).toFixed(1)}`;
    for (let i = 1; i < values.length; i++) {
      const cpx = (sx(i-1) + sx(i)) / 2;
      lineD += ` C${cpx.toFixed(1)},${sy(values[i-1]).toFixed(1)} ${cpx.toFixed(1)},${sy(values[i]).toFixed(1)} ${sx(i).toFixed(1)},${sy(values[i]).toFixed(1)}`;
    }

    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    svg += `<path d="${lineD}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`;
    const li = values.length - 1;
    svg += `<circle cx="${sx(li).toFixed(1)}" cy="${sy(values[li]).toFixed(1)}" r="2.5" fill="${c}"/>`;
    svg += '</svg>';
    return svg;
  },

  // ==================== TOAST ====================
  showToast(text, duration = 2500) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    clearTimeout(this._toastTimeout);
    toast.textContent = text;
    toast.classList.add('visible');
    this._toastTimeout = setTimeout(() => toast.classList.remove('visible'), duration);
  },

  // ==================== УТИЛИТЫ ====================

  // Общий хелпер: собирает статистику по подходам упражнения
  getExerciseSetData(ex, exData, cycleMaxWeight) {
    let completedSets = 0, totalSets = 0, maxWeight = 0, vol = 0, reps = 0;
    const weights = [];

    if (ex.segments && !ex.isIndividual) {
      let setNum = 0;
      ex.segments.forEach(seg => {
        const calcW = this.roundWeight(cycleMaxWeight * seg.percent / 100);
        for (let s = 0; s < seg.sets; s++) {
          totalSets++;
          const ov = exData.setWeights && exData.setWeights[setNum] !== undefined
            ? exData.setWeights[setNum] : null;
          const w = ov !== null ? ov : calcW;
          weights.push(w);
          if (w > maxWeight) maxWeight = w;
          const done = exData.sets && exData.sets[setNum] && exData.sets[setNum].done;
          if (done) {
            completedSets++;
            const actualR = exData.sets && exData.sets[setNum] && exData.sets[setNum].actualReps !== undefined ? exData.sets[setNum].actualReps : seg.reps;
            reps += actualR;
            vol += w * actualR;
          }
          setNum++;
        }
      });
    } else if (ex.isIndividual) {
      totalSets = ex.sets;
      for (let i = 0; i < ex.sets; i++) {
        const w = exData.setWeights && exData.setWeights[i] !== undefined
          ? exData.setWeights[i] : (exData.weight || 0);
        weights.push(w);
        if (w > maxWeight) maxWeight = w;
        const done = exData.sets && exData.sets[i] && exData.sets[i].done;
        if (done) {
          completedSets++;
          const actualR = exData.sets && exData.sets[i] && exData.sets[i].actualReps !== undefined ? exData.sets[i].actualReps : ex.reps;
          reps += actualR;
          vol += w * actualR;
        }
      }
    } else if (ex.isBodyweight) {
      totalSets = ex.sets;
      for (let i = 0; i < ex.sets; i++) {
        const done = exData.sets && exData.sets[i] && exData.sets[i].done;
        if (done) {
          completedSets++;
          const actualR = exData.sets && exData.sets[i] && exData.sets[i].actualReps !== undefined ? exData.sets[i].actualReps : ex.reps;
          reps += actualR;
        }
      }
    }

    return { completedSets, totalSets, maxWeight, vol, reps, weights };
  },

  roundWeight(weight) {
    const step = this.data.weightStep || 0.5;
    return Math.round(weight / step) * step;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// ==================== СТАРТ ПРИЛОЖЕНИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
