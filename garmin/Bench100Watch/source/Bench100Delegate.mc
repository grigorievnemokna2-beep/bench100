using Toybox.WatchUi as WatchUi;

class Bench100Delegate extends WatchUi.BehaviorDelegate {
    private var _model;

    function initialize(model) {
        BehaviorDelegate.initialize();
        _model = model;
    }

    function onSelect() {
        _model.handleSelect();
        return true;
    }

    function onTap(event) {
        var coordinates = event.getCoordinates();
        _model.handleTap(coordinates[1], 416);
        return true;
    }

    function onNextPage() {
        _model.changeRpe(-1);
        return true;
    }

    function onPreviousPage() {
        _model.changeRpe(1);
        return true;
    }

    function onBack() {
        return _model.handleBack();
    }

    function onMenu() {
        _model.clearPairing();
        return true;
    }
}
