sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
    "use strict";

    return ControllerExtension.extend("zmesconfmass.zmesconfmass.ext.controller.SessionObjectPageExt", {

        override: {
            onInit: function () {
                console.log("[ButtonVisibility] onInit called");
                var oView = this.base.getView();

                oView.bindElement({
                    path: "",
                    events: {
                        change: this._onSessionContextChange.bind(this)
                    }
                });
            }
        },

        _onSessionContextChange: function () {
            console.log("[ButtonVisibility] _onSessionContextChange fired");

            var oContext = this.base.getView().getBindingContext();
            if (!oContext) {
                console.log("[ButtonVisibility] no context yet, skipping");
                return;
            }

            var oView = this.base.getView();
            var oTable = oView.byId("fe::table::_Operations::LineItem");
            console.log("[ButtonVisibility] table via byId:", oTable);

            if (!oTable || typeof oTable.initialized !== "function") {
                console.log("[ButtonVisibility] table not found or no initialized() method, aborting");
                return;
            }

            var aFlagNames = ["IsSterilization", "IsAnodizing", "IsLaserMarking",
                              "IsManualOp", "IsMeo", "IsLabeling", "IsWaterjet"];

            Promise.all([oContext.requestProperty(aFlagNames), oTable.initialized()]).then(function () {
                console.log("[ButtonVisibility] flags loaded AND table initialized");

                var mVisibility = {
                    "confirmSterilization": oContext.getProperty("IsSterilization") === "X",
                    "confirmAnodizing": oContext.getProperty("IsAnodizing") === "X",
                    "confirmLaserMarking": oContext.getProperty("IsLaserMarking") === "X",
                    "confirmManualOp": oContext.getProperty("IsManualOp") === "X",
                    "confirmMeo": oContext.getProperty("IsMeo") === "X",
                    "confirmLabeling": oContext.getProperty("IsLabeling") === "X",
                    "startWaterjet": oContext.getProperty("IsWaterjet") === "X",
                    "confirmWaterjet": oContext.getProperty("IsWaterjet") === "X"
                };

                console.log("[ButtonVisibility] computed visibility:", JSON.stringify(mVisibility));

                var aAllActionButtons = oTable.findAggregatedObjects(true, function (oControl) {
                    return oControl.getId && oControl.getId().indexOf("DataFieldForAction") > -1;
                });
                console.log("[ButtonVisibility] DataFieldForAction buttons found:", aAllActionButtons.length);

                Object.keys(mVisibility).forEach(function (sActionName) {
                    var aButtons = aAllActionButtons.filter(function (oControl) {
                        return oControl.getId().indexOf(sActionName) > -1;
                    });

                    console.log("[ButtonVisibility]", sActionName, "-> found", aButtons.length, "control(s)");

                    aButtons.forEach(function (oButton) {
                        console.log("[ButtonVisibility] setting", oButton.getId(), "visible =", mVisibility[sActionName]);
                        oButton.setVisible(mVisibility[sActionName]);
                    });
                });
            }).catch(function (oError) {
                console.log("[ButtonVisibility] failed:", oError);
            });
        }
    });
});