using Toybox.Application as Application;
using Toybox.WatchUi as WatchUi;

class Bench100App extends Application.AppBase {
    private var _model;

    function initialize() {
        AppBase.initialize();
        _model = new Bench100Model();
    }

    function onStart(state) {
        _model.begin();
    }

    function onStop(state) {
        _model.shutdown();
    }

    function onSettingsChanged() {
        _model.settingsChanged();
    }

    function getInitialView() {
        var view = new Bench100View(_model);
        _model.attachView(view);
        return [view, new Bench100Delegate(_model)];
    }
}
