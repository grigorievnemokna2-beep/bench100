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

  // Модальное окно
  modalCallback: null,

  // Графики
  _chartId: 0,

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  init() {
    this.loadData();
    this.showCycles();
  },

  // ==================== ДАННЫЕ ====================
  // Загрузка данных из localStorage
  loadData() {
    const raw = localStorage.getItem('bench100_data');
    if (raw) {
      this.data = JSON.parse(raw);
    } else {
      this.data = { cycles: [] };
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
          alert('Неверный формат файла');
          return;
        }
        if (!confirm(`Восстановить данные? (${imported.cycles.length} проходок)\nТекущие данные будут заменены.`)) return;
        this.data = imported;
        this.saveData();
        this.showCycles();
        alert('Данные восстановлены!');
      } catch (err) {
        alert('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  // ==================== НАВИГАЦИЯ ====================
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
  },

  goBack() {
    // Универсальная кнопка назад
    if (this.currentExIndex !== null) {
      this.showDay();
    } else if (this.currentDay !== null) {
      this.showWeeks();
    } else if (this.currentCycleId !== null) {
      this.showWeeks();
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

    container.innerHTML = this.data.cycles.map(cycle => {
      const totalWorkouts = this.getTotalWorkouts();
      const completedWorkouts = this.getCompletedWorkouts(cycle);
      const progressPercent = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

      return `
        <div class="cycle-card" onclick="App.openCycle('${cycle.id}')">
          <button class="cycle-delete" onclick="event.stopPropagation(); App.deleteCycle('${cycle.id}')" title="Удалить">&#x2715;</button>
          <h3>${this.escapeHtml(cycle.name)}</h3>
          <div class="cycle-meta">
            <span class="cycle-max">Макс: ${cycle.maxWeight} кг</span>
            &nbsp;&middot;&nbsp;
            <span>${completedWorkouts}/${totalWorkouts} тренировок</span>
          </div>
          <div class="cycle-progress-bar">
            <div class="cycle-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      `;
    }).join('');
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

  // ==================== СОЗДАНИЕ ПРОХОДКИ ====================
  showAddCycle() {
    this.showScreen('add-cycle');
    document.getElementById('cycle-name').value = `Проходка ${this.data.cycles.length + 1}`;
    document.getElementById('cycle-max').value = '';
    document.getElementById('cycle-max').focus();
  },

  createCycle() {
    const name = document.getElementById('cycle-name').value.trim() || 'Проходка';
    const maxWeight = parseFloat(document.getElementById('cycle-max').value);

    if (!maxWeight || maxWeight <= 0) {
      alert('Укажи свой максимум в жиме лёжа!');
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
    this.data.cycles = this.data.cycles.filter(c => c.id !== id);
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
    this.renderWeeks();
  },

  getCycle() {
    return this.data.cycles.find(c => c.id === this.currentCycleId);
  },

  renderWeeks() {
    const container = document.getElementById('weeks-list');
    const cycle = this.getCycle();

    container.innerHTML = PROGRAM.map(week => {
      const daysHtml = week.days.map(day => {
        const key = `${week.week}-${day.day}`;
        const workout = cycle.workouts ? cycle.workouts[key] : null;
        const completed = workout && workout.completed;
        const cls = completed ? 'completed' : '';

        return `<div class="day-chip ${cls}" onclick="event.stopPropagation(); App.openDay(${week.week}, '${day.day}')">${day.day}${completed ? ' &#10003;' : ''}</div>`;
      }).join('');

      return `
        <div class="week-card">
          <div class="week-header">
            <span class="week-number">Неделя ${week.week}</span>
            <span class="week-title">${week.title}</span>
          </div>
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
    this.renderExercises(dayData, workout, cycle.maxWeight);
  },

  renderExercises(dayData, workout, maxWeight) {
    const container = document.getElementById('exercises-list');

    container.innerHTML = dayData.exercises.map((ex, idx) => {
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
        detailsHtml = ex.note || `${ex.totalReps} повторений`;
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
        noteHtml = `<div class="ex-note">${ex.note}</div>`;
      }

      // Выполнение
      const completedSets = saved ? (saved.completedSets || 0) : 0;
      const totalSets = this.getTotalSets(ex);
      if (completedSets > 0) {
        checkHtml = `<div class="ex-check">${completedSets >= totalSets ? '&#10003; Выполнено' : `${completedSets}/${totalSets} подходов`}</div>`;
      }

      return `
        <div class="exercise-card ${baseCls}" onclick="App.openExercise(${idx})">
          <button class="ex-info-btn" onclick="event.stopPropagation(); App.showExerciseInfo(${idx})" title="Инфо">i</button>
          <div class="ex-name">${idx + 1}. ${customName}</div>
          <div class="ex-details">${detailsHtml}</div>
          ${supersetHtml}
          ${noteHtml}
          ${checkHtml}
        </div>
      `;
    }).join('');
  },

  // ==================== ЭКРАН: УПРАЖНЕНИЕ (ПОДХОДЫ) ====================
  openExercise(idx) {
    this.currentExIndex = idx;
    this.showScreen('exercise');
    this.resetTimer();
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
      html += `<div class="exercise-note">${ex.note}</div>`;
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

    container.innerHTML = html;
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

        html += `
          <div class="set-row">
            <div class="set-number">${setNum}</div>
            <div class="set-info">
              <div class="set-weight editable" onclick="App.showSetWeightInput(${setNum - 1}, false, ${calcWeight})">
                ${weight} кг <small>(${seg.percent}%)</small>
                ${isOverridden ? '<small class="override-mark">изм.</small>' : ''}
              </div>
              <div class="set-reps">${seg.reps} повторений</div>
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
      // Вес для каждого подхода отдельно
      const setWeight = saved && saved.setWeights && saved.setWeights[i] !== undefined
        ? saved.setWeights[i]
        : (saved && saved.weight ? saved.weight : null);

      html += `
        <div class="set-row ${done ? 'set-done' : ''}">
          <div class="set-number">${i + 1}</div>
          <div class="set-info">
            <div class="set-weight individual" onclick="App.showSetWeightInput(${i}, ${isSuperset})">
              ${setWeight ? setWeight + ' кг' : 'Указать вес'}
            </div>
            <div class="set-reps">${ex.reps} повторений</div>
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

      html += `
        <div class="set-row">
          <div class="set-number">${i + 1}</div>
          <div class="set-info">
            <div class="set-weight" style="color: var(--text-dim)">Без веса</div>
            <div class="set-reps">${ex.reps} повторений</div>
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
            <div class="set-weight" style="color: var(--yellow)">${ex.note || ex.name}</div>
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

    // Переключаем
    if (exData.sets[setIdx] && exData.sets[setIdx].done) {
      exData.sets[setIdx].done = false;
    } else {
      exData.sets[setIdx] = { done: true, timestamp: new Date().toISOString() };
    }

    // Считаем выполненные
    exData.completedSets = Object.values(exData.sets).filter(s => s.done).length;

    // Проверяем завершение всей тренировки
    this.checkWorkoutCompletion(workout);

    this.saveData();
    this.renderSets();
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
    });

    workout.completed = allDone;
  },

  getTotalSets(ex) {
    if (ex.isSpecial) return ex.totalReps > 0 ? 1 : 1;
    if (ex.segments && !ex.isIndividual) {
      return ex.segments.reduce((sum, seg) => sum + seg.sets, 0);
    }
    return ex.sets || 0;
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

    this.saveData();
    this.renderSets();
  },

  // Старый метод для совместимости
  showWeightInput(isSuperset = false) {
    this.showSetWeightInput(0, isSuperset);
  },

  saveWeight() {
    const weight = parseFloat(document.getElementById('modal-weight-input').value);
    if (!weight || weight <= 0) {
      alert('Введи корректный вес!');
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
  showExerciseInfo(exIdx) {
    const weekData = PROGRAM.find(w => w.week === this.currentWeek);
    const dayData = weekData.days.find(d => d.day === this.currentDay);
    const ex = dayData.exercises[exIdx];
    if (!ex || ex.isSpecial) return;

    const exName = ex.name;
    const cycle = this.getCycle();
    const allCycles = this.data.cycles;

    // Собираем все записи этого упражнения из ВСЕХ проходок
    const records = [];

    allCycles.forEach(c => {
      if (!c.workouts) return;
      PROGRAM.forEach(week => {
        week.days.forEach(day => {
          const key = `${week.week}-${day.day}`;
          const workout = c.workouts[key];
          if (!workout || !workout.exercises) return;

          day.exercises.forEach((pEx, pIdx) => {
            if (pEx.name !== exName) return;
            const exData = workout.exercises[pIdx];
            if (!exData) return;

            // Пропускаем текущее упражнение (чтобы показать только предыдущие)
            if (c.id === cycle.id && week.week === this.currentWeek && day.day === this.currentDay && pIdx === exIdx) return;

            let completedSets = 0;
            let totalSets = 0;
            let weights = [];
            let reps = 0;

            if (pEx.segments && !pEx.isIndividual) {
              let setNum = 0;
              pEx.segments.forEach(seg => {
                const calcW = this.roundWeight(c.maxWeight * seg.percent / 100);
                for (let s = 0; s < seg.sets; s++) {
                  totalSets++;
                  const ov = exData.setWeights && exData.setWeights[setNum] !== undefined
                    ? exData.setWeights[setNum] : null;
                  const w = ov !== null ? ov : calcW;
                  const done = exData.sets && exData.sets[setNum] && exData.sets[setNum].done;
                  if (done) {
                    completedSets++;
                    weights.push(w);
                    reps += seg.reps;
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
                if (done) {
                  completedSets++;
                  if (w > 0) weights.push(w);
                  reps += pEx.reps;
                }
              }
            } else if (pEx.isBodyweight) {
              totalSets = pEx.sets;
              for (let i = 0; i < pEx.sets; i++) {
                const done = exData.sets && exData.sets[i] && exData.sets[i].done;
                if (done) {
                  completedSets++;
                  reps += pEx.reps;
                }
              }
            }

            if (completedSets > 0) {
              records.push({
                cycleName: c.name,
                week: week.week,
                day: day.day,
                weights,
                maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
                completedSets,
                totalSets,
                reps
              });
            }
          });
        });
      });
    });

    // Формируем контент модалки
    const modal = document.getElementById('modal-info');
    const title = document.getElementById('modal-info-title');
    const body = document.getElementById('modal-info-body');

    title.textContent = ex.name;

    if (records.length === 0) {
      body.innerHTML = '<div class="info-empty">Нет данных о предыдущих тренировках</div>';
    } else {
      // Показываем последние 5 записей (от новых к старым)
      const last = records.slice(-5).reverse();
      let html = '';

      last.forEach(r => {
        const uniqueW = [...new Set(r.weights)].sort((a, b) => a - b);
        const weightStr = uniqueW.length > 0 ? uniqueW.join(' / ') + ' кг' : 'б/в';
        const allDone = r.completedSets >= r.totalSets;

        html += `
          <div class="info-record">
            <div class="info-when">${allCycles.length > 1 ? '<span class="info-cycle">' + this.escapeHtml(r.cycleName) + '</span> ' : ''}Нед.${r.week} ${r.day}</div>
            <div class="info-data">
              <span class="info-weight">${weightStr}</span>
              <span class="info-reps">${r.reps} повт.</span>
              <span class="info-sets ${allDone ? 'all-done' : ''}">${r.completedSets}/${r.totalSets}</span>
            </div>
          </div>
        `;
      });

      // PR
      const allWeights = records.flatMap(r => r.weights).filter(w => w > 0);
      if (allWeights.length > 0) {
        const pr = Math.max(...allWeights);
        html = `<div class="info-pr">PR: ${pr} кг</div>` + html;
      }

      body.innerHTML = html;
    }

    modal.classList.remove('hidden');
  },

  // ==================== ТАЙМЕР ====================
  setTimer(seconds) {
    this.timerTarget = seconds;
    this.timerSeconds = seconds;
    this.timerRunning = false;
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
      clearInterval(this.timerInterval);
      const btn = document.getElementById('btn-timer-toggle');
      btn.textContent = 'Старт';
      btn.classList.remove('running');
    } else {
      // Старт
      if (this.timerSeconds <= 0 && this.timerTarget > 0) {
        this.timerSeconds = this.timerTarget;
      }
      if (this.timerSeconds <= 0) {
        this.timerSeconds = 120; // 2 мин по умолчанию
        this.timerTarget = 120;
      }

      this.timerRunning = true;
      const btn = document.getElementById('btn-timer-toggle');
      btn.textContent = 'Пауза';
      btn.classList.add('running');

      this.timerInterval = setInterval(() => {
        this.timerSeconds--;
        this.updateTimerDisplay();

        if (this.timerSeconds <= 0) {
          clearInterval(this.timerInterval);
          this.timerRunning = false;
          btn.textContent = 'Старт';
          btn.classList.remove('running');
          this.timerFinished();
        }
      }, 1000);
    }
  },

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timerRunning = false;
    this.timerSeconds = this.timerTarget || 0;
    this.updateTimerDisplay();

    const btn = document.getElementById('btn-timer-toggle');
    btn.textContent = 'Старт';
    btn.classList.remove('running');

    const display = document.getElementById('timer-display');
    display.classList.remove('running', 'warning', 'done');
  },

  updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const minutes = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    display.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

    display.classList.remove('running', 'warning', 'done');
    if (this.timerRunning) {
      if (this.timerSeconds <= 10) {
        display.classList.add('warning');
      } else {
        display.classList.add('running');
      }
    }
    if (this.timerSeconds <= 0 && this.timerTarget > 0) {
      display.classList.add('done');
    }
  },

  timerFinished() {
    const display = document.getElementById('timer-display');
    display.classList.add('done');
    display.textContent = '0:00';

    // Вибрация (если поддерживается)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

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
    } catch (e) {
      // Нет поддержки аудио
    }
  },

  // ==================== УПРАВЛЕНИЕ ТАЙМЕРОМ ====================
  adjustTimer(seconds) {
    this.timerSeconds = Math.max(0, this.timerSeconds + seconds);
    if (!this.timerRunning) {
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
          if (!wo || !wo.exercises) return;
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
                    const e1rm = this.calc1RM(w, seg.reps);
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
          if (ex.segments && !ex.isIndividual) {
            let sn = 0;
            ex.segments.forEach(seg => {
              const cW = this.roundWeight(cycle.maxWeight * seg.percent / 100);
              for (let s = 0; s < seg.sets; s++) {
                const ov = ed.setWeights && ed.setWeights[sn] !== undefined ? ed.setWeights[sn] : null;
                const w = ov !== null ? ov : cW;
                if (ed.sets && ed.sets[sn] && ed.sets[sn].done) { vol += w * seg.reps; sets++; }
                sn++;
              }
            });
          } else if (ex.isIndividual) {
            for (let i = 0; i < ex.sets; i++) {
              const w = ed.setWeights && ed.setWeights[i] !== undefined ? ed.setWeights[i] : (ed.weight || 0);
              if (ed.sets && ed.sets[i] && ed.sets[i].done) { vol += w * ex.reps; sets++; }
            }
          } else if (ex.isBodyweight) {
            for (let i = 0; i < ex.sets; i++) {
              if (ed.sets && ed.sets[i] && ed.sets[i].done) sets++;
            }
          }
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

    // 1RM hero
    const est1RM = this.getEstimated1RM(cycles);
    const maxW = isSingle ? currentCycle.maxWeight : Math.max(...cycles.map(c => c.maxWeight));
    html += `<div class="overview-hero">
      <div class="hero-1rm">
        <div class="hero-1rm-val">${est1RM > 0 ? est1RM : maxW}</div>
        <div class="hero-1rm-label">${est1RM > 0 ? 'РАСЧЁТНЫЙ 1RM' : 'МАКСИМУМ'} (кг)</div>
        ${est1RM > 0 ? `<div class="hero-1rm-sub">Установленный макс: ${maxW} кг</div>` : ''}
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
      html += `<div class="progress-section"><h3>Календарь тренировок</h3>${this.renderCalendar(currentCycle)}</div>`;
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
          if (!wo || !wo.exercises) return;
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
        if (r.maxWeight > 0 && r.completedSets > 0) {
          const approxReps = r.reps > 0 ? Math.round(r.reps / r.completedSets) : 1;
          const e1rm = this.calc1RM(r.maxWeight, approxReps);
          if (e1rm > best1RM) { best1RM = e1rm; bestWeight = r.maxWeight; bestReps = approxReps; }
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
          if (!workout || !workout.exercises) return;

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

            let completedSets = 0;
            let totalSets = 0;
            let maxWeight = 0;
            let vol = 0;
            let reps = 0;
            let weights = [];

            if (ex.segments && !ex.isIndividual) {
              let setNum = 0;
              ex.segments.forEach(seg => {
                const calcW = this.roundWeight(cycle.maxWeight * seg.percent / 100);
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
                    vol += w * seg.reps;
                    reps += seg.reps;
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
                  vol += w * ex.reps;
                  reps += ex.reps;
                }
              }
            } else if (ex.isBodyweight) {
              totalSets = ex.sets;
              for (let i = 0; i < ex.sets; i++) {
                const done = exData.sets && exData.sets[i] && exData.sets[i].done;
                if (done) {
                  completedSets++;
                  reps += ex.reps;
                }
              }
            }

            if (completedSets > 0) {
              history[name].records.push({
                cycleName: cycle.name,
                cycleMax: cycle.maxWeight,
                week: week.week,
                day: day.day,
                maxWeight,
                weights: weights.filter(w => w > 0),
                completedSets,
                totalSets,
                vol,
                reps
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
            html += `<div class="stat-1rm-row"><span class="stat-1rm-label">Расчётный 1RM:</span><span class="stat-1rm-val">${e1rm} кг</span></div>`;
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

          if (ex.segments && !ex.isIndividual) {
            let setNum = 0;
            ex.segments.forEach(seg => {
              const calcW = this.roundWeight(cycle.maxWeight * seg.percent / 100);
              for (let s = 0; s < seg.sets; s++) {
                const ov = exData.setWeights && exData.setWeights[setNum] !== undefined
                  ? exData.setWeights[setNum] : null;
                const w = ov !== null ? ov : calcW;
                const done = exData.sets && exData.sets[setNum] && exData.sets[setNum].done;
                if (done) vol += w * seg.reps;
                setNum++;
              }
            });
          } else if (ex.isIndividual) {
            for (let i = 0; i < ex.sets; i++) {
              const w = exData.setWeights && exData.setWeights[i] !== undefined
                ? exData.setWeights[i] : (exData.weight || 0);
              const done = exData.sets && exData.sets[i] && exData.sets[i].done;
              if (done) vol += w * ex.reps;
            }
          }
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
    const c = '#e83040';
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
    const c = options.color || '#e83040';
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
    const c = options.color || '#e83040';
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

  // ==================== УТИЛИТЫ ====================
  roundWeight(weight) {
    // Округление до 0.5 кг (минимальный шаг блинов)
    return Math.round(weight * 2) / 2;
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
