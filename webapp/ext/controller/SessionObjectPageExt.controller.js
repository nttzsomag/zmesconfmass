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
        this._getOperationsState(oTable)
    ]).then(function (aResults) {
        console.log("[ButtonVisibility] flags loaded, table initialized, operations state resolved");

        var oOpsState = aResults[2];
        var bWaterjetStarted = oOpsState.waterjetStarted;
        var bSterilizationOpen = oOpsState.sterilizationOpen;
        var bIsWaterjet = oContext.getProperty("IsWaterjet") === "X";
        var bIsSterilization = oContext.getProperty("IsSterilization") === "X";

        var mVisibility = {
            "confirmSterilization": bIsSterilization,
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

        var bLockListActions = (bIsWaterjet && bWaterjetStarted) || (bIsSterilization && bSterilizationOpen);
        console.log("[ListLock] bLockListActions:", bLockListActions,
            "(waterjet:", bWaterjetStarted, ", sterilization:", bSterilizationOpen, ")");

        this._setListActionsEnabled(oTable, oView, !bLockListActions);

    }.bind(this)).catch(function (oError) {
        console.log("[ButtonVisibility] failed:", oError);
    });
},

        _getOperationsState: function (oTable) {
            var oRowBinding = oTable.getRowBinding();

            if (!oRowBinding) {
                return Promise.resolve({ isEmpty: true, waterjetStarted: false, sterilizationOpen: false });
            }

            return oRowBinding.requestContexts(0, 1).then(function (aOpContexts) {
                if (aOpContexts.length === 0) {
                    return { isEmpty: true, waterjetStarted: false, sterilizationOpen: false };
                }
                return aOpContexts[0].requestProperty(["UserStatusShortText", "NaploId"]).then(function () {
                    var sNaploId = aOpContexts[0].getProperty("NaploId");
                    var iNaploId = parseInt(sNaploId, 10) || 0;
                    return {
                        isEmpty: false,
                        waterjetStarted: aOpContexts[0].getProperty("UserStatusShortText") === "FDLI",
                        sterilizationOpen: iNaploId > 0
                    };
                });
            }).catch(function (oError) {
                console.error("[Operations] state check error:", oError);
                return { isEmpty: true, waterjetStarted: false, sterilizationOpen: false };
            });
        },

        _setListActionsEnabled: function (oTable, oView, bEnabled) {
            var aDeleteButtons = oTable.findAggregatedObjects(true, function (oControl) {
                return oControl.getId && oControl.getId().indexOf("deleteRow") > -1
                    && typeof oControl.setEnabled === "function";
            });
            console.log("[ListLock] delete buttons found:", aDeleteButtons.length);
            aDeleteButtons.forEach(function (oButton) {
                console.log("[ListLock] setting delete button", oButton.getId(), "enabled =", bEnabled);
                oButton.setEnabled(bEnabled);
            });

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