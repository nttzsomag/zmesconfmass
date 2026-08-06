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

            Promise.all([
                oContext.requestProperty(aFlagNames),
                oTable.initialized(),
                this._getWaterjetStarted(oContext)
            ]).then(function (aResults) {
                console.log("[ButtonVisibility] flags loaded, table initialized, waterjet state resolved");

                var bWaterjetStarted = aResults[2];
                var bIsWaterjet = oContext.getProperty("IsWaterjet") === "X";

                var mVisibility = {
                    "confirmSterilization": oContext.getProperty("IsSterilization") === "X",
                    "confirmAnodizing": oContext.getProperty("IsAnodizing") === "X",
                    "confirmLaserMarking": oContext.getProperty("IsLaserMarking") === "X",
                    "confirmManualOp": oContext.getProperty("IsManualOp") === "X",
                    "confirmMeo": oContext.getProperty("IsMeo") === "X",
                    "confirmLabeling": oContext.getProperty("IsLabeling") === "X",
                    "startWaterjet": bIsWaterjet && !bWaterjetStarted,
                    "confirmWaterjet": bIsWaterjet && bWaterjetStarted
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

                // Vízvágás köztes állapot: törlés/scan gombok tiltása
                var bLockListActions = bIsWaterjet && bWaterjetStarted;
                console.log("[ListLock] bLockListActions:", bLockListActions);

                this._setListActionsEnabled(oTable, oView, !bLockListActions);

            }.bind(this)).catch(function (oError) {
                console.log("[ButtonVisibility] failed:", oError);
            });
        },

        // A lista első sorából olvassuk vissza a WaterjetStarted állapotot -
        // mivel a lista mindig homogén állapotú, elég egy sort megnézni
        _getWaterjetStarted: function (oSessionContext) {
            var oModel = this.base.getModel();
            var oOperationsBinding = oModel.bindList("_Operations", oSessionContext);

            return oOperationsBinding.requestContexts(0, 1).then(function (aOpContexts) {
                if (aOpContexts.length === 0) {
                    return false;
                }
                return aOpContexts[0].requestProperty("WjStarted").then(function () {
                    return aOpContexts[0].getProperty("WjStarted") === "X";
                });
            }).catch(function (oError) {
                console.error("[Waterjet] state check error:", oError);
                return false;
            });
        },

        // Törlés és beolvasás gombok engedélyezése/tiltása
        _setListActionsEnabled: function (oTable, oView, bEnabled) {
            // Törlés: "deleteRow" custom action
            var aDeleteButtons = oTable.findAggregatedObjects(true, function (oControl) {
                return oControl.getId && oControl.getId().indexOf("deleteRow") > -1
                    && typeof oControl.setEnabled === "function";
            });
            console.log("[ListLock] delete buttons found:", aDeleteButtons.length);
            aDeleteButtons.forEach(function (oButton) {
                console.log("[ListLock] setting delete button", oButton.getId(), "enabled =", bEnabled);
                oButton.setEnabled(bEnabled);
            });

            // Beolvasás: "scanBarcode" custom action
            var aScanButtons = oTable.findAggregatedObjects(true, function (oControl) {
                return oControl.getId && oControl.getId().indexOf("scanBarcode") > -1
                    && typeof oControl.setEnabled === "function";
            });
            console.log("[ListLock] scan buttons found:", aScanButtons.length);
            aScanButtons.forEach(function (oButton) {
                console.log("[ListLock] setting scan button", oButton.getId(), "enabled =", bEnabled);
                oButton.setEnabled(bEnabled);
            });
        }
    });
});