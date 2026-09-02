using Toybox.ActivityRecording as ActivityRecording;
using Toybox.Application.Properties as Properties;
using Toybox.Application.Storage as Storage;
using Toybox.Attention as Attention;
using Toybox.Communications as Communications;
using Toybox.Sensor as Sensor;
using Toybox.SensorHistory as SensorHistory;
using Toybox.System as System;
using Toybox.Time as Time;
using Toybox.Timer as Timer;
using Toybox.WatchUi as WatchUi;

class Bench100Model {
    var state = "loading";
    var message = "Подключение...";
    var workout = null;
    var exerciseIndex = 0;
    var setIndex = 0;
    var restSeconds = 0;
    var heartRate = 0;
    var bodyBattery = -1;
    var stress = -1;
    var readinessScore = -1;
    var rpe = 8;
    var completedSets = [];

    private var _view = null;
    private var _deviceToken = null;
    private var _apiUrl = "";
    private var _pairCode = "";
    private var _restTimer = null;
    private var _session = null;
    private var _startedAt = 0;
    private var _hrSum = 0;
    private var _hrSamples = 0;
    private var _maxHr = 0;
    private var _finishing = false;

    function initialize() {
        _restTimer = new Timer.Timer();
        _deviceToken = Storage.getValue("deviceToken");
        loadSettings();
    }

    function attachView(view) {
        _view = view;
        update();
    }

    function begin() {
        readReadiness();
        enableHeartRate();
        if (_apiUrl.length() == 0) {
            state = "setup";
            message = "Укажи адрес API\nв настройках Connect IQ";
            update();
            return;
        }
        if (_deviceToken == null || _deviceToken.length() == 0) {
            pair();
        } else {
            sendPendingOrFetch();
        }
    }

    function settingsChanged() {
        loadSettings();
        _deviceToken = null;
        Storage.deleteValue("deviceToken");
        begin();
    }

    function loadSettings() {
        var url = Properties.getValue("apiUrl");
        var code = Properties.getValue("pairCode");
        _apiUrl = url == null ? "" : url.toString();
        while (_apiUrl.length() > 0 && _apiUrl.substring(_apiUrl.length() - 1, _apiUrl.length()).equals("/")) {
            _apiUrl = _apiUrl.substring(0, _apiUrl.length() - 1);
        }
        _pairCode = code == null ? "" : code.toString();
    }

    function pair() {
        if (_pairCode.length() != 6) {
            state = "setup";
            message = "Введи 6-значный код\nв настройках Connect IQ";
            update();
            return;
        }
        state = "loading";
        message = "Привязываю часы...";
        update();
        request("/devices/pair", "POST", {
            "code" => _pairCode,
            "name" => "Garmin Venu 2 Plus"
        }, null, method(:onPaired));
    }

    function onPaired(responseCode, data) {
        if (responseCode == 200 || responseCode == 201) {
            _deviceToken = data["deviceToken"];
            Storage.setValue("deviceToken", _deviceToken);
            fetchWorkout();
        } else {
            fail("Код не принят\nСоздай новый в Bench 100");
        }
    }

    function sendPendingOrFetch() {
        var pending = Storage.getValue("pendingResult");
        if (pending != null) {
            state = "loading";
            message = "Досылаю прошлый результат...";
            update();
            request("/devices/results", "POST", pending, _deviceToken, method(:onPendingSent));
        } else {
            fetchWorkout();
        }
    }

    function onPendingSent(responseCode, data) {
        if (responseCode == 200 || responseCode == 201) {
            Storage.deleteValue("pendingResult");
        }
        fetchWorkout();
    }

    function fetchWorkout() {
        state = "loading";
        message = "Загружаю тренировку...";
        update();
        request("/devices/workout", "GET", {}, _deviceToken, method(:onWorkout));
    }

    function onWorkout(responseCode, data) {
        if (responseCode == 401) {
            _deviceToken = null;
            Storage.deleteValue("deviceToken");
            pair();
            return;
        }
        if (responseCode != 200 || data == null) {
            fail("Нет связи с сервером\nПроверь телефон");
            return;
        }
        workout = data["workout"];
        if (workout == null || workout["ex"] == null || workout["ex"].size() == 0) {
            state = "empty";
            message = "Отправь тренировку\nиз Bench 100";
            update();
            sendReadiness();
            return;
        }
        exerciseIndex = 0;
        setIndex = 0;
        completedSets = [];
        advancePastCompleted();
        state = "ready";
        message = "";
        update();
        sendReadiness();
    }

    function request(path, methodName, body, token, callback) {
        var headers = { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON };
        if (token != null && token.length() > 0) {
            headers["Authorization"] = "Bearer " + token;
        }
        var method = Communications.HTTP_REQUEST_METHOD_GET;
        if (methodName.equals("POST")) {
            method = Communications.HTTP_REQUEST_METHOD_POST;
        } else if (methodName.equals("PUT")) {
            method = Communications.HTTP_REQUEST_METHOD_PUT;
        }
        var options = {
            :method => method,
            :headers => headers,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(_apiUrl + path, body, options, callback);
    }

    function readReadiness() {
        bodyBattery = latestHistory(:bodyBattery);
        stress = latestHistory(:stress);
        if (bodyBattery >= 0 || stress >= 0) {
            var bb = bodyBattery >= 0 ? bodyBattery : 50;
            var st = stress >= 0 ? stress : 50;
            readinessScore = ((bb * 65) + ((100 - st) * 35)) / 100;
        }
    }

    function latestHistory(kind) {
        try {
            var iterator = null;
            if (kind == :bodyBattery && (Toybox.SensorHistory has :getBodyBatteryHistory)) {
                iterator = SensorHistory.getBodyBatteryHistory({ :period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST });
            } else if (kind == :stress && (Toybox.SensorHistory has :getStressHistory)) {
                iterator = SensorHistory.getStressHistory({ :period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST });
            }
            if (iterator != null) {
                var sample = iterator.next();
                if (sample != null && sample.data != null) {
                    return sample.data.toNumber();
                }
            }
        } catch (error) {
            System.println("Sensor history unavailable: " + error.getErrorMessage());
        }
        return -1;
    }

    function readinessPayload() {
        return {
            "bodyBattery" => bodyBattery,
            "stress" => stress,
            "score" => readinessScore,
            "heartRate" => heartRate,
            "measuredAt" => Time.now().value()
        };
    }

    function sendReadiness() {
        if (_deviceToken == null) {
            return;
        }
        request("/devices/readiness", "POST", readinessPayload(), _deviceToken, method(:onReadinessSent));
    }

    function onReadinessSent(responseCode, data) {
        // Readiness is advisory; a network failure must not block the workout.
    }

    function enableHeartRate() {
        try {
            Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
            Sensor.enableSensorEvents(method(:onSensor));
        } catch (error) {
            System.println("Heart rate unavailable: " + error.getErrorMessage());
        }
    }

    function onSensor(info as Sensor.Info) as Void {
        if (info.heartRate != null) {
            heartRate = info.heartRate;
            if (state.equals("active") || state.equals("rest") || state.equals("rpe")) {
                _hrSum += heartRate;
                _hrSamples += 1;
                if (heartRate > _maxHr) {
                    _maxHr = heartRate;
                }
            }
            update();
        }
    }

    function startWorkout() {
        if (workout == null) {
            return;
        }
        try {
            _session = ActivityRecording.createSession({
                :name => "Bench 100",
                :sport => ActivityRecording.SPORT_TRAINING,
                :subSport => ActivityRecording.SUB_SPORT_STRENGTH_TRAINING
            });
            _session.start();
        } catch (error) {
            _session = null;
            System.println("FIT recording unavailable: " + error.getErrorMessage());
        }
        _startedAt = Time.now().value();
        _hrSum = 0;
        _hrSamples = 0;
        _maxHr = 0;
        _finishing = false;
        state = "active";
        update();
    }

    function completeCurrentSet() {
        if (!state.equals("active")) {
            return;
        }
        var exercise = currentExercise();
        var set = currentSet();
        if (exercise == null || set == null) {
            return;
        }
        completedSets.add({
            "x" => exercise["x"],
            "u" => exercise["u"],
            "i" => set["i"],
            "w" => set["w"],
            "r" => set["r"],
            "at" => Time.now().value()
        });
        if (_session != null && _session.isRecording()) {
            _session.addLap();
        }
        restSeconds = set["d"] == null ? 90 : set["d"].toNumber();
        moveNext();
        if (isWorkoutComplete()) {
            requestFinish();
            return;
        }
        state = "rest";
        _restTimer.stop();
        _restTimer.start(method(:restTick), 1000, true);
        update();
    }

    function restTick() {
        restSeconds -= 1;
        if (restSeconds <= 0) {
            skipRest();
            Attention.vibrate([new Attention.VibeProfile(75, 450)]);
        } else {
            update();
        }
    }

    function skipRest() {
        _restTimer.stop();
        restSeconds = 0;
        if (!isWorkoutComplete()) {
            state = "active";
        }
        update();
    }

    function moveNext() {
        var exercise = currentExercise();
        if (exercise == null) {
            return;
        }
        setIndex += 1;
        if (setIndex >= exercise["s"].size()) {
            exerciseIndex += 1;
            setIndex = 0;
        }
        advancePastCompleted();
    }

    function advancePastCompleted() {
        var exercises = workout == null ? null : workout["ex"];
        if (exercises == null) {
            return;
        }
        while (exerciseIndex < exercises.size()) {
            var exercise = exercises[exerciseIndex];
            var sets = exercise["s"];
            while (setIndex < sets.size() && sets[setIndex]["c"] == 1) {
                setIndex += 1;
            }
            if (setIndex < sets.size()) {
                return;
            }
            exerciseIndex += 1;
            setIndex = 0;
        }
    }

    function currentExercise() {
        if (workout == null || workout["ex"] == null || exerciseIndex >= workout["ex"].size()) {
            return null;
        }
        return workout["ex"][exerciseIndex];
    }

    function currentSet() {
        var exercise = currentExercise();
        if (exercise == null || exercise["s"] == null || setIndex >= exercise["s"].size()) {
            return null;
        }
        return exercise["s"][setIndex];
    }

    function isWorkoutComplete() {
        return workout == null || workout["ex"] == null || exerciseIndex >= workout["ex"].size();
    }

    function requestFinish() {
        _restTimer.stop();
        if (_session != null && _session.isRecording()) {
            _session.stop();
        }
        state = "rpe";
        update();
    }

    function changeRpe(delta) {
        if (!state.equals("rpe")) {
            return;
        }
        rpe += delta;
        if (rpe < 1) {
            rpe = 1;
        }
        if (rpe > 10) {
            rpe = 10;
        }
        update();
    }

    function submitWorkout() {
        if (_finishing) {
            return;
        }
        _finishing = true;
        if (_session != null) {
            try {
                if (_session.isRecording()) {
                    _session.stop();
                }
                _session.save();
            } catch (error) {
                System.println("FIT save failed: " + error.getErrorMessage());
            }
        }
        var finishedAt = Time.now().value();
        var result = {
            "workoutId" => workout["id"],
            "startedAt" => _startedAt,
            "finishedAt" => finishedAt,
            "duration" => finishedAt - _startedAt,
            "complete" => isWorkoutComplete(),
            "rpe" => rpe,
            "avgHr" => _hrSamples > 0 ? _hrSum / _hrSamples : 0,
            "maxHr" => _maxHr,
            "readiness" => readinessPayload(),
            "sets" => completedSets
        };
        Storage.setValue("pendingResult", result);
        state = "syncing";
        message = "Сохраняю результат...";
        update();
        request("/devices/results", "POST", result, _deviceToken, method(:onResultSent));
    }

    function onResultSent(responseCode, data) {
        if (responseCode == 200 || responseCode == 201) {
            Storage.deleteValue("pendingResult");
            message = "Тренировка сохранена\nи отправлена в Bench 100";
        } else {
            message = "Сохранено на часах\nОтправлю при следующем запуске";
        }
        state = "done";
        update();
    }

    function handleSelect() {
        if (state.equals("ready")) {
            startWorkout();
        } else if (state.equals("active")) {
            completeCurrentSet();
        } else if (state.equals("rest")) {
            skipRest();
        } else if (state.equals("rpe")) {
            submitWorkout();
        } else if (state.equals("done") || state.equals("empty") || state.equals("error")) {
            fetchWorkout();
        }
    }

    function handleTap(y, height) {
        if (state.equals("rpe")) {
            if (y < height / 3) {
                changeRpe(1);
            } else if (y > (height * 2) / 3) {
                changeRpe(-1);
            } else {
                submitWorkout();
            }
        } else {
            handleSelect();
        }
    }

    function handleBack() {
        if (state.equals("rest")) {
            skipRest();
            return true;
        }
        if (state.equals("active")) {
            requestFinish();
            return true;
        }
        return false;
    }

    function clearPairing() {
        _deviceToken = null;
        Storage.deleteValue("deviceToken");
        state = "setup";
        message = "Связь сброшена\nВведи новый код";
        update();
    }

    function fail(text) {
        state = "error";
        message = text;
        update();
    }

    function update() {
        if (_view != null) {
            WatchUi.requestUpdate();
        }
    }

    function shutdown() {
        _restTimer.stop();
        try {
            Sensor.setEnabledSensors([]);
        } catch (error) {
        }
        if (_session != null && _session.isRecording()) {
            try {
                _session.stop();
                _session.save();
            } catch (error) {
            }
        }
    }
}
