// ============================================================
// BENCH 100 — синхронизация с Garmin Connect IQ
// ============================================================
// PWA остаётся local-first. На сервер отправляется только выбранная
// тренировка, а результаты с часов аккуратно сливаются обратно.

const GarminSync = {
  STORAGE_KEY: 'bench100_garmin_sync',
  app: null,
  config: null,
  _syncTimer: null,
  _applyingResult: false,

  init(app) {
    this.app = app;
    this.config = this.loadConfig();
    if (this.isConnected()) {
      setTimeout(() => this.refresh(true), 800);
    }
  },

  defaultConfig() {
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    return {
      endpoint: local ? `${location.origin}/api/v1` : '',
      accountId: '',
      accountToken: '',
      pairCode: '',
      pairExpiresAt: 0,
      lastPublished: null,
      lastResultAt: 0,
      appliedResultIds: [],
      device: null,
      readiness: null,
      lastError: '',
      lastSeenAt: 0
    };
  },

  loadConfig() {
    try {
      return Object.assign(this.defaultConfig(), JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'));
    } catch (_) {
      return this.defaultConfig();
    }
  },

  saveConfig() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
  },

  normalizeEndpoint(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  },

  isConnected() {
    return Boolean(this.config && this.config.endpoint && this.config.accountToken);
  },

  isSecureEndpoint(endpoint) {
    try {
      const url = new URL(endpoint);
      return url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname);
    } catch (_) {
      return false;
    }
  },

  async request(path, options = {}, authenticated = true) {
    const endpoint = this.normalizeEndpoint(this.config.endpoint);
    if (!endpoint) throw new Error('Сначала укажи адрес сервера');
    if (!this.isSecureEndpoint(endpoint)) throw new Error('Для часов нужен HTTPS-адрес');
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (authenticated && this.config.accountToken) {
      headers.Authorization = `Bearer ${this.config.accountToken}`;
    }
    const response = await fetch(`${endpoint}${path}`, Object.assign({}, options, { headers }));
    let data = {};
    try { data = await response.json(); } catch (_) { /* empty response */ }
    if (!response.ok) {
      const messages = {
        unauthorized: 'Связь устарела — подключи её заново',
        pairing_code_invalid: 'Код привязки недействителен',
        invalid_workout: 'Сервер не принял формат тренировки'
      };
      throw new Error(messages[data.error] || `Ошибка сервера: ${response.status}`);
    }
    return data;
  },

  setEndpoint(value) {
    this.config.endpoint = this.normalizeEndpoint(value);
    this.config.lastError = '';
    this.saveConfig();
  },

  async connect() {
    const input = document.getElementById('garmin-api-url');
    const endpoint = this.normalizeEndpoint(input ? input.value : this.config.endpoint);
    this.config.endpoint = endpoint;
    this.saveConfig();

    if (!this.isSecureEndpoint(endpoint)) {
      this.app.showToast('Нужен HTTPS-адрес сервера');
      return;
    }

    this.setBusy(true, 'Проверяю сервер…');
    try {
      await this.request('/health', { method: 'GET' }, false);
      const created = await this.request('/accounts', {
        method: 'POST',
        body: JSON.stringify({ name: 'Сергей — Bench 100' })
      }, false);
      this.config.accountId = created.accountId;
      this.config.accountToken = created.accountToken;
      this.config.lastError = '';
      this.saveConfig();
      this.app.showToast('Сервер подключён');
      this.app.renderSettings();
      await this.makePairingCode();
    } catch (error) {
      this.config.lastError = error.message;
      this.saveConfig();
      this.app.showToast(error.message);
      this.app.renderSettings();
    } finally {
      this.setBusy(false);
    }
  },

  async disconnect() {
    if (!confirm('Отключить Garmin от Bench 100 на этом телефоне?')) return;
    if (this.isConnected()) {
      try {
        await this.request('/accounts', { method: 'DELETE' });
      } catch (error) {
        this.app.showToast(`Не удалось удалить связь: ${error.message}`);
        return;
      }
    }
    const endpoint = this.config.endpoint;
    this.config = this.defaultConfig();
    this.config.endpoint = endpoint;
    this.saveConfig();
    this.app.renderSettings();
    this.app.showToast('Garmin отключён');
  },

  async makePairingCode() {
    if (!this.isConnected()) return;
    this.setBusy(true, 'Создаю код…');
    try {
      const result = await this.request('/pairing', { method: 'POST', body: '{}' });
      this.config.pairCode = result.code;
      this.config.pairExpiresAt = result.expiresAt;
      this.config.lastError = '';
      this.saveConfig();
      this.app.renderSettings();
      this.app.showToast('Код действует 15 минут');
    } catch (error) {
      this.config.lastError = error.message;
      this.saveConfig();
      this.app.showToast(error.message);
      this.app.renderSettings();
    } finally {
      this.setBusy(false);
    }
  },

  async copyPairCode() {
    if (!this.config.pairCode) return;
    try {
      await navigator.clipboard.writeText(this.config.pairCode);
      this.app.showToast('Код скопирован');
    } catch (_) {
      this.app.showToast(`Код: ${this.config.pairCode}`);
    }
  },

  async refresh(silent = false) {
    if (!this.isConnected()) return;
    if (!silent) this.setBusy(true, 'Получаю данные с часов…');
    try {
      const [status, results] = await Promise.all([
        this.request('/status', { method: 'GET' }),
        this.request(`/results?after=${Number(this.config.lastResultAt || 0)}`, { method: 'GET' })
      ]);
      this.config.device = status.device || null;
      this.config.readiness = status.readiness || this.config.readiness;
      this.config.lastSeenAt = Date.now();
      this.config.lastError = '';
      const applied = this.applyResults(results.results || []);
      this.config.lastResultAt = Math.max(
        this.config.lastResultAt || 0,
        ...(results.results || []).map(item => Number(item.receivedAt || 0))
      );
      this.saveConfig();
      if (!silent) this.app.showToast(applied ? `Принято результатов: ${applied}` : 'Данные актуальны');
      this.refreshVisibleScreen();
    } catch (error) {
      this.config.lastError = error.message;
      this.saveConfig();
      if (!silent) this.app.showToast(error.message);
      if (document.getElementById('screen-settings').classList.contains('active')) this.app.renderSettings();
    } finally {
      this.setBusy(false);
    }
  },

  onAppDataChanged() {
    if (!this.isConnected() || this._applyingResult) return;
    if (!this.app.currentCycleId || !this.app.currentWeek || !this.app.currentDay) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this.publishCurrentWorkout(true), 1200);
  },

  async publishCurrentWorkout(silent = false) {
    if (!this.isConnected()) {
      if (!silent) {
        this.app.showToast('Сначала подключи Garmin в настройках');
        this.app.showSettings();
      }
      return;
    }
    const payload = this.buildCurrentWorkout();
    if (!payload) {
      if (!silent) this.app.showToast('Открой нужный день тренировки');
      return;
    }
    if (!silent) this.setBusy(true, 'Отправляю тренировку…');
    try {
      const result = await this.request('/workouts/current', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      this.config.lastPublished = {
        workoutId: payload.id,
        cycleId: this.app.currentCycleId,
        week: this.app.currentWeek,
        day: this.app.currentDay,
        title: payload.title,
        updatedAt: result.updatedAt || Date.now()
      };
      this.config.lastError = '';
      this.saveConfig();
      if (!silent) this.app.showToast('Тренировка отправлена на часы');
      this.refreshVisibleScreen();
    } catch (error) {
      this.config.lastError = error.message;
      this.saveConfig();
      if (!silent) this.app.showToast(error.message);
    } finally {
      this.setBusy(false);
    }
  },

  buildCurrentWorkout() {
    const cycle = this.app.getCycle();
    if (!cycle) return null;
    const week = this.app.getCycleProgram(cycle).find(item => item.week === this.app.currentWeek);
    const day = week && week.days.find(item => item.day === this.app.currentDay);
    if (!day) return null;
    const workoutKey = `${this.app.currentWeek}-${this.app.currentDay}`;
    const savedWorkout = cycle.workouts && cycle.workouts[workoutKey];
    const exercises = [];

    day.exercises.forEach((exercise, exerciseIndex) => {
      const saved = savedWorkout && savedWorkout.exercises ? savedWorkout.exercises[exerciseIndex] : null;
      const normalized = this.normalizeExercise(exercise, saved, cycle, exerciseIndex, false);
      if (normalized) exercises.push(normalized);
      if (exercise.superset) {
        const supersetSaved = saved && saved.superset ? saved.superset : null;
        const superset = this.normalizeExercise(exercise.superset, supersetSaved, cycle, exerciseIndex, true);
        if (superset) exercises.push(superset);
      }
    });

    return {
      v: 1,
      id: `${cycle.id}:${this.app.currentWeek}:${this.app.currentDay}`,
      title: `Неделя ${this.app.currentWeek} · ${this.app.currentDay}`,
      cycle: String(cycle.name || 'Проходка').slice(0, 48),
      week: this.app.currentWeek,
      day: this.app.currentDay,
      max: Number(cycle.maxWeight || 0),
      ex: exercises,
      sentAt: Date.now()
    };
  },

  normalizeExercise(exercise, saved, cycle, exerciseIndex, isSuperset) {
    const sets = [];
    const rest = exercise.isBase ? 180 : 90;
    const fallbackWeight = this.findLastWeight(exercise.name, cycle.id);

    if (exercise.segments && !exercise.isIndividual) {
      let setIndex = 0;
      exercise.segments.forEach(segment => {
        const calculated = this.app.roundWeight(cycle.maxWeight * segment.percent / 100);
        for (let i = 0; i < segment.sets; i++) {
          const override = saved && saved.setWeights && saved.setWeights[setIndex] !== undefined
            ? saved.setWeights[setIndex] : calculated;
          sets.push(this.makeSet(setIndex, override, segment.reps, rest, saved));
          setIndex++;
        }
      });
    } else if (exercise.isSpecial) {
      sets.push(this.makeSet(0, 0, exercise.totalReps || 1, rest, saved));
    } else {
      const count = Number(exercise.sets || 0);
      for (let i = 0; i < count; i++) {
        const weight = exercise.isBodyweight ? 0
          : (saved && saved.setWeights && saved.setWeights[i] !== undefined
            ? saved.setWeights[i]
            : (saved && saved.weight !== undefined ? saved.weight : fallbackWeight));
        sets.push(this.makeSet(i, weight || 0, exercise.reps || 1, rest, saved));
      }
    }
    if (!sets.length) return null;
    return {
      x: exerciseIndex,
      u: isSuperset ? 1 : 0,
      n: String(exercise.name || 'Упражнение').slice(0, 80),
      b: exercise.isBase ? 1 : 0,
      s: sets
    };
  },

  makeSet(index, weight, reps, rest, saved) {
    const setData = saved && saved.sets ? saved.sets[index] : null;
    return {
      i: index,
      w: Number(weight || 0),
      r: Number(setData && setData.actualReps !== undefined ? setData.actualReps : reps || 1),
      d: Number(rest || 90),
      c: setData && setData.done ? 1 : 0
    };
  },

  findLastWeight(exerciseName, preferredCycleId) {
    let result = 0;
    (this.app.data.cycles || []).forEach(cycle => {
      const program = this.app.getCycleProgram(cycle);
      program.forEach(week => week.days.forEach(day => {
        const workout = cycle.workouts && cycle.workouts[`${week.week}-${day.day}`];
        if (!workout || !workout.exercises) return;
        day.exercises.forEach((exercise, index) => {
          if (exercise.name !== exerciseName) return;
          const saved = workout.exercises[index];
          if (!saved) return;
          const weights = saved.setWeights ? Object.values(saved.setWeights).map(Number).filter(Boolean) : [];
          if (weights.length) result = weights[weights.length - 1];
          else if (Number(saved.weight) > 0) result = Number(saved.weight);
        });
      }));
    });
    return result;
  },

  applyResults(items) {
    let applied = 0;
    const known = new Set(this.config.appliedResultIds || []);
    items.forEach(item => {
      if (!item || known.has(item.id) || !item.payload) return;
      if (this.applyResult(item.payload)) applied++;
      known.add(item.id);
    });
    this.config.appliedResultIds = Array.from(known).slice(-200);
    return applied;
  },

  applyResult(result) {
    const match = String(result.workoutId || '').match(/^(.+):(\d+):([^:]+)$/);
    if (!match) return false;
    const cycle = (this.app.data.cycles || []).find(item => String(item.id) === match[1]);
    if (!cycle) return false;
    const weekNumber = Number(match[2]);
    const dayName = match[3];
    const workoutKey = `${weekNumber}-${dayName}`;
    if (!cycle.workouts) cycle.workouts = {};
    const workout = cycle.workouts[workoutKey] || (cycle.workouts[workoutKey] = {
      exercises: {}, date: new Date().toISOString(), completed: false
    });
    if (!workout.exercises) workout.exercises = {};

    (result.sets || []).forEach(set => {
      const exerciseIndex = Number(set.x);
      const setIndex = Number(set.i);
      if (!Number.isFinite(exerciseIndex) || !Number.isFinite(setIndex)) return;
      const root = workout.exercises[exerciseIndex] || (workout.exercises[exerciseIndex] = {
        sets: {}, completedSets: 0
      });
      const target = set.u
        ? (root.superset || (root.superset = { sets: {}, completedSets: 0 }))
        : root;
      if (!target.sets) target.sets = {};
      target.sets[setIndex] = {
        done: true,
        actualReps: Math.max(0, Number(set.r || 0)),
        timestamp: set.at ? new Date(Number(set.at) * 1000).toISOString() : new Date().toISOString(),
        source: 'garmin'
      };
      if (Number(set.w) > 0) {
        if (!target.setWeights) target.setWeights = {};
        target.setWeights[setIndex] = Number(set.w);
      }
      target.completedSets = Object.values(target.sets).filter(entry => entry.done).length;
    });

    workout.startedAt = result.startedAt
      ? new Date(Number(result.startedAt) * 1000).toISOString()
      : (workout.startedAt || new Date().toISOString());
    if (result.finishedAt) workout.finishedAt = new Date(Number(result.finishedAt) * 1000).toISOString();
    workout.completed = Boolean(result.complete);
    workout.garmin = {
      syncedAt: new Date().toISOString(),
      rpe: Number(result.rpe || 0),
      avgHr: Number(result.avgHr || 0),
      maxHr: Number(result.maxHr || 0),
      durationSeconds: Number(result.duration || 0)
    };
    if (result.readiness) this.config.readiness = Object.assign({}, result.readiness, { receivedAt: Date.now() });
    this._applyingResult = true;
    this.app.saveData();
    this._applyingResult = false;
    return true;
  },

  readinessScore(readiness) {
    if (!readiness) return null;
    const bodyBattery = Number(readiness.bodyBattery);
    const stress = Number(readiness.stress);
    if (!Number.isFinite(bodyBattery) && !Number.isFinite(stress)) return null;
    const bbPart = Number.isFinite(bodyBattery) ? bodyBattery : 50;
    const stressPart = Number.isFinite(stress) ? 100 - stress : 50;
    return Math.round(bbPart * 0.65 + stressPart * 0.35);
  },

  readinessLabel(score) {
    if (score === null) return { text: 'Нет данных', cls: 'neutral' };
    if (score >= 70) return { text: 'Высокая', cls: 'good' };
    if (score >= 45) return { text: 'Средняя', cls: 'medium' };
    return { text: 'Низкая', cls: 'low' };
  },

  renderSettingsCard() {
    const connected = this.isConnected();
    const endpoint = this.escape(this.config.endpoint || '');
    const device = this.config.device;
    const pairValid = this.config.pairCode && this.config.pairExpiresAt > Date.now();
    const score = this.readinessScore(this.config.readiness);
    const readiness = this.readinessLabel(score);
    const error = this.config.lastError
      ? `<div class="garmin-error">${this.escape(this.config.lastError)}</div>` : '';
    const deviceHtml = device
      ? `<div class="garmin-device connected"><span class="garmin-dot"></span><div><strong>${this.escape(device.name || 'Garmin')}</strong><small>Часы подключены</small></div></div>`
      : `<div class="garmin-device"><span class="garmin-dot"></span><div><strong>Venu 2 Plus</strong><small>${connected ? 'Ожидает ввода кода на часах' : 'Не подключены'}</small></div></div>`;

    let controls = '';
    if (!connected) {
      controls = `
        <label class="garmin-field-label" for="garmin-api-url">Адрес сервера синхронизации</label>
        <input id="garmin-api-url" class="form-input" value="${endpoint}" placeholder="https://…/api/v1" onchange="GarminSync.setEndpoint(this.value)">
        <button class="btn-primary garmin-main-btn" onclick="GarminSync.connect()">Подключить сервер</button>`;
    } else {
      const pairHtml = pairValid ? `
        <button class="garmin-pair-code" onclick="GarminSync.copyPairCode()">
          <span>Код привязки</span><strong>${this.escape(this.config.pairCode)}</strong><small>Нажми, чтобы скопировать</small>
        </button>` : '';
      const readinessHtml = this.config.readiness ? `
        <div class="garmin-readiness ${readiness.cls}">
          <div><small>Готовность</small><strong>${score === null ? '—' : score}</strong></div>
          <div><small>Body Battery</small><strong>${this.valueOrDash(this.config.readiness.bodyBattery)}</strong></div>
          <div><small>Стресс</small><strong>${this.valueOrDash(this.config.readiness.stress)}</strong></div>
          <span>${readiness.text}</span>
        </div>` : '';
      controls = `
        ${pairHtml}
        ${readinessHtml}
        <div class="garmin-actions">
          <button class="btn-secondary" onclick="GarminSync.makePairingCode()">Новый код</button>
          <button class="btn-secondary" onclick="GarminSync.refresh()">Получить данные</button>
        </div>
        <button class="garmin-disconnect" onclick="GarminSync.disconnect()">Отключить Garmin</button>`;
    }

    return `
      <div class="settings-section garmin-settings">
        <div class="garmin-heading"><div><span class="garmin-mark">G</span><div><div class="settings-label">Garmin Connect IQ</div><div class="settings-hint">Тренировка на часах и синхронизация подходов</div></div></div><span class="garmin-state ${connected ? 'on' : ''}">${connected ? 'ВКЛ' : 'ВЫКЛ'}</span></div>
        ${deviceHtml}
        ${error}
        ${controls}
        <div id="garmin-busy" class="garmin-busy hidden"></div>
      </div>`;
  },

  renderDaySyncCard() {
    if (!this.isConnected()) {
      return `<button class="garmin-day-card muted" onclick="App.showSettings()"><span class="garmin-mark">G</span><span><strong>Подключить Garmin</strong><small>Тренировка, таймер и пульс на часах</small></span><b>›</b></button>`;
    }
    const currentId = `${this.app.currentCycleId}:${this.app.currentWeek}:${this.app.currentDay}`;
    const published = this.config.lastPublished && this.config.lastPublished.workoutId === currentId;
    const readiness = this.config.readiness;
    const score = this.readinessScore(readiness);
    const label = this.readinessLabel(score);
    return `
      <div class="garmin-day-card ${published ? 'published' : ''}">
        <span class="garmin-mark">G</span>
        <span><strong>${published ? 'Тренировка на часах' : 'Отправить на Venu 2 Plus'}</strong><small>${score === null ? 'Подходы и таймер отдыха' : `Готовность ${score}/100 · ${label.text.toLowerCase()}`}</small></span>
        <button onclick="event.stopPropagation(); GarminSync.publishCurrentWorkout()">${published ? 'Обновить' : 'Отправить'}</button>
      </div>`;
  },

  renderWorkoutGarminSummary(workout) {
    if (!workout || !workout.garmin) return '';
    const data = workout.garmin;
    const hr = data.avgHr ? `${data.avgHr} ср. / ${data.maxHr || '—'} макс.` : 'нет данных';
    return `<div class="garmin-workout-summary"><span class="garmin-mark">G</span><div><strong>Записано часами</strong><small>Пульс: ${hr} · RPE: ${data.rpe || '—'} · ${Math.round((data.durationSeconds || 0) / 60)} мин</small></div></div>`;
  },

  refreshVisibleScreen() {
    if (document.getElementById('screen-settings').classList.contains('active')) {
      this.app.renderSettings();
    } else if (document.getElementById('screen-day').classList.contains('active')) {
      this.app.showDay();
    }
  },

  setBusy(active, text = '') {
    const element = document.getElementById('garmin-busy');
    if (!element) return;
    element.classList.toggle('hidden', !active);
    element.textContent = text;
  },

  valueOrDash(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : '—';
  },

  escape(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = GarminSync;
