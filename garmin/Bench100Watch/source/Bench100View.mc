using Toybox.Graphics as Graphics;
using Toybox.WatchUi as WatchUi;

class Bench100View extends WatchUi.View {
    private var _model;
    private var _bg = 0x0E0E0E;
    private var _text = 0xFFFFFF;
    private var _muted = 0x777777;
    private var _lime = 0xCDFF00;
    private var _blue = 0x11A9ED;

    function initialize(model) {
        View.initialize();
        _model = model;
    }

    function onUpdate(dc) {
        dc.setColor(_bg, _bg);
        dc.clear();
        drawHeader(dc);

        if (_model.state.equals("pairing")) {
            drawPairing(dc);
        } else if (_model.state.equals("ready")) {
            drawReady(dc);
        } else if (_model.state.equals("active")) {
            drawActive(dc, false);
        } else if (_model.state.equals("rest")) {
            drawActive(dc, true);
        } else if (_model.state.equals("rpe")) {
            drawRpe(dc);
        } else {
            drawMessage(dc);
        }
    }

    function drawHeader(dc) {
        dc.setColor(_blue, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(34, 34, 18);
        dc.setColor(_text, Graphics.COLOR_TRANSPARENT);
        dc.drawText(34, 34, Graphics.FONT_SMALL, "G", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.drawText(61, 34, Graphics.FONT_SMALL, "BENCH 100", Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        if (_model.heartRate > 0) {
            dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
            dc.drawText(dc.getWidth() - 28, 34, Graphics.FONT_XTINY, "♥ " + _model.heartRate, Graphics.TEXT_JUSTIFY_RIGHT | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    function drawMessage(dc) {
        dc.setColor(_text, Graphics.COLOR_TRANSPARENT);
        var title = "BENCH 100";
        if (_model.state.equals("error")) {
            title = "ОШИБКА";
        } else if (_model.state.equals("done")) {
            title = "ГОТОВО";
        } else if (_model.state.equals("setup")) {
            title = "НАСТРОЙКА";
        } else if (_model.state.equals("empty")) {
            title = "НЕТ ТРЕНИРОВКИ";
        }
        dc.drawText(dc.getWidth() / 2, 145, Graphics.FONT_MEDIUM, title, Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        drawTwoLines(dc, _model.message, 198, Graphics.FONT_SMALL);
        dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
        if (_model.state.equals("done") || _model.state.equals("empty") || _model.state.equals("error")) {
            dc.drawText(dc.getWidth() / 2, 326, Graphics.FONT_XTINY, "НАЖМИ — ОБНОВИТЬ", Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    function drawReady(dc) {
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 90, Graphics.FONT_XTINY, _model.workout["title"], Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_text, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 130, Graphics.FONT_LARGE, _model.workout["ex"].size().toString(), Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 178, Graphics.FONT_XTINY, "УПРАЖНЕНИЙ", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
        var readiness = _model.readinessScore >= 0 ? _model.readinessScore.toString() : "—";
        dc.drawText(dc.getWidth() / 2, 222, Graphics.FONT_MEDIUM, readiness + " / 100", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 257, Graphics.FONT_XTINY, "ГОТОВНОСТЬ  •  BB " + valueOrDash(_model.bodyBattery) + "  •  СТРЕСС " + valueOrDash(_model.stress), Graphics.TEXT_JUSTIFY_CENTER);
        drawButton(dc, "НАЧАТЬ", 315);
    }

    function drawPairing(dc) {
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 92, Graphics.FONT_XTINY, "КОД ПРИВЯЗКИ", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 172, Graphics.FONT_NUMBER_MILD, _model.pairingCode, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(_text, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 235, Graphics.FONT_SMALL, "Введи код в Bench 100", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 270, Graphics.FONT_XTINY, "НАСТРОЙКИ → GARMIN CONNECT IQ", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(dc.getWidth() / 2, 326, Graphics.FONT_XTINY, "ОЖИДАЮ ПОДКЛЮЧЕНИЯ…", Graphics.TEXT_JUSTIFY_CENTER);
    }

    function drawActive(dc, resting) {
        var exercise = _model.currentExercise();
        var set = _model.currentSet();
        if (exercise == null || set == null) {
            return;
        }

        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 82, Graphics.FONT_XTINY,
            "УПРАЖНЕНИЕ " + (_model.exerciseIndex + 1) + " / " + _model.workout["ex"].size(), Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_text, Graphics.COLOR_TRANSPARENT);
        drawTwoLines(dc, shorten(exercise["n"], 40), 112, Graphics.FONT_SMALL);

        if (resting) {
            dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
            dc.drawText(dc.getWidth() / 2, 220, Graphics.FONT_NUMBER_MILD, formatTime(_model.restSeconds), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
            dc.drawText(dc.getWidth() / 2, 268, Graphics.FONT_XTINY, "ОТДЫХ • НАЖМИ, ЧТОБЫ ПРОПУСТИТЬ", Graphics.TEXT_JUSTIFY_CENTER);
            drawProgress(dc);
            return;
        }

        dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
        var weightText = set["w"].toNumber() > 0 ? set["w"].toString() + " кг" : "БЕЗ ВЕСА";
        dc.drawText(dc.getWidth() / 2, 205, Graphics.FONT_LARGE, weightText, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(_text, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 250, Graphics.FONT_MEDIUM,
            set["r"].toString() + " ПОВТ.  •  ПОДХОД " + (_model.setIndex + 1) + " / " + exercise["s"].size(), Graphics.TEXT_JUSTIFY_CENTER);
        drawButton(dc, "ПОДХОД СДЕЛАН", 315);
        drawProgress(dc);
    }

    function drawRpe(dc) {
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 96, Graphics.FONT_XTINY, "НАСКОЛЬКО ТЯЖЕЛО БЫЛО?", Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 188, Graphics.FONT_NUMBER_MILD, _model.rpe.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(_muted, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, 245, Graphics.FONT_XTINY, "RPE  •  ВВЕРХ +  •  ВНИЗ −", Graphics.TEXT_JUSTIFY_CENTER);
        drawButton(dc, "СОХРАНИТЬ", 315);
    }

    function drawProgress(dc) {
        var total = 0;
        var exercises = _model.workout["ex"];
        for (var i = 0; i < exercises.size(); i++) {
            total += exercises[i]["s"].size();
        }
        var done = _model.completedSets.size();
        var width = dc.getWidth() - 100;
        var filled = total > 0 ? (width * done) / total : 0;
        dc.setColor(0x2A2A2A, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(50, dc.getHeight() - 38, width, 4);
        dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(50, dc.getHeight() - 38, filled, 4);
    }

    function drawButton(dc, label, y) {
        dc.setColor(_lime, Graphics.COLOR_TRANSPARENT);
        dc.fillRoundedRectangle(80, y, dc.getWidth() - 160, 48, 24);
        dc.setColor(0x050505, Graphics.COLOR_TRANSPARENT);
        dc.drawText(dc.getWidth() / 2, y + 24, Graphics.FONT_SMALL, label, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function drawTwoLines(dc, text, y, font) {
        var source = text.toString();
        var pieces = [];
        var lineBreak = source.find("\n");
        if (lineBreak != null) {
            pieces.add(source.substring(0, lineBreak));
            pieces.add(source.substring(lineBreak + 1, source.length()));
        } else if (source.length() > 22) {
            var middle = source.length() / 2;
            var split = middle;
            while (split < source.length() && !source.substring(split, split + 1).equals(" ")) {
                split += 1;
            }
            pieces.add(source.substring(0, split));
            pieces.add(source.substring(split, source.length()));
        } else {
            pieces.add(source);
        }
        for (var i = 0; i < pieces.size() && i < 2; i++) {
            dc.drawText(dc.getWidth() / 2, y + (i * 30), font, pieces[i], Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    function shorten(value, maxLength) {
        var text = value == null ? "Упражнение" : value.toString();
        return text.length() > maxLength ? text.substring(0, maxLength - 1) + "…" : text;
    }

    function formatTime(seconds) {
        var minutes = seconds / 60;
        var rest = seconds % 60;
        return minutes.format("%d") + ":" + rest.format("%02d");
    }

    function valueOrDash(value) {
        return value >= 0 ? value.toString() : "—";
    }
}
