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

            if (!oTable || typeof oTable.initialized !== "function") {
                console.log("[ButtonVisibility] table not found, aborting");
                return;
            }

            oTable.initialized().then(function () {

                var fnSetupAndRefresh = function () {
                    var oRowBinding = oTable.getRowBinding();
                    console.log("[ButtonVisibility] oRowBinding after bindingUpdated:", oRowBinding);

                    if (oRowBinding && !oRowBinding.__buttonStateListenerAttached) {
                        console.log("[ButtonVisibility] attaching dataReceived listener");
                        oRowBinding.attachEvent("dataReceived", function () {
                            console.log("[ButtonVisibility] list data changed, re-evaluating");
                            this._refreshButtonStates(oContext, oTable, oView);
                        }.bind(this));
                        oRowBinding.__buttonStateListenerAttached = true;
                    }

                    this._refreshButtonStates(oContext, oTable, oView);
                }.bind(this);

                if (oTable.getRowBinding()) {
                    // már van binding, mehet azonnal
                    fnSetupAndRefresh();
                } else {
                    // várjuk meg, amíg a tábla ténylegesen létrehozza a binding-ot
                    console.log("[ButtonVisibility] no row binding yet, waiting for bindingUpdated");
                    oTable.attachEventOnce("bindingUpdated", function () {
                        console.log("[ButtonVisibility] bindingUpdated fired");
                        fnSetupAndRefresh();
                    });
                }

            }.bind(this));
        },

_refreshButtonStates: function (oContext, oTable, oView) {
    var aFlagNames = ["IsSterilization", "IsAnodizing", "IsLaserMarking",
        "IsManualOp", "IsMeo", "IsLabeling", "IsWaterjet", "SupervisorApprovalRequired"];

    Promise.all([
        oContext.requestProperty(aFlagNames),
        this._getOperationsState(oTable)
    ]).then(function (aResults) {
        console.log("[ButtonVisibility] flags loaded, operations state resolved");

        var oOpsState = aResults[1];
        var bWaterjetStarted = oOpsState.waterjetStarted;
        var bSterilizationOpen = oOpsState.sterilizationOpen;
        var bIsWaterjet = oContext.getProperty("IsWaterjet") === "X";
        var bIsSterilization = oContext.getProperty("IsSterilization") === "X";
        var bApprovalRequired = oContext.getProperty("SupervisorApprovalRequired") === true
            || oContext.getProperty("SupervisorApprovalRequired") === "X";

        console.log("[ButtonVisibility] SupervisorApprovalRequired raw =",
            JSON.stringify(oContext.getProperty("SupervisorApprovalRequired")), "-> bApprovalRequired =", bApprovalRequired);

        var mVisibility = {
            "confirmSterilization":       bIsSterilization && !bApprovalRequired,
            "confirmSterilizationAppr":   bIsSterilization && bApprovalRequired,

            "confirmAnodizing":           oContext.getProperty("IsAnodizing") === "X" && !bApprovalRequired,
            "confirmAnodizingApprove":    oContext.getProperty("IsAnodizing") === "X" && bApprovalRequired,

            "confirmLaserMarking":        oContext.getProperty("IsLaserMarking") === "X" && !bApprovalRequired,
            "confirmLaserMarkingApprove": oContext.getProperty("IsLaserMarking") === "X" && bApprovalRequired,

            "confirmManualOp":            oContext.getProperty("IsManualOp") === "X" && !bApprovalRequired,
            "confirmManualOpApprove":     oContext.getProperty("IsManualOp") === "X" && bApprovalRequired,

            "confirmMeo":                 oContext.getProperty("IsMeo") === "X" && !bApprovalRequired,
            "confirmMeoApprove":          oContext.getProperty("IsMeo") === "X" && bApprovalRequired,

            "confirmLabeling":            oContext.getProperty("IsLabeling") === "X" && !bApprovalRequired,
            "confirmLabelingApprove":     oContext.getProperty("IsLabeling") === "X" && bApprovalRequired,

            "startWaterjet":              bIsWaterjet && !bWaterjetStarted && !bApprovalRequired,
            "startWaterjetApprove":       bIsWaterjet && !bWaterjetStarted && bApprovalRequired,

            "confirmWaterjet":            bIsWaterjet && bWaterjetStarted && !bApprovalRequired,
            "confirmWaterjetApprove":     bIsWaterjet && bWaterjetStarted && bApprovalRequired
        };

        console.log("[ButtonVisibility] computed visibility:", JSON.stringify(mVisibility));

        var aAllActionButtons = oTable.findAggregatedObjects(true, function (oControl) {
            return oControl.getId && oControl.getId().indexOf("DataFieldForAction") > -1;
        });

        Object.keys(mVisibility).forEach(function (sActionName) {
            var aButtons = aAllActionButtons.filter(function (oControl) {
                return oControl.getId().indexOf(sActionName) > -1;
            });

            aButtons.forEach(function (oButton) {
                console.log("[ButtonVisibility] setting", oButton.getId(), "visible =", mVisibility[sActionName]);
                oButton.setVisible(mVisibility[sActionName]);
            });
        });

        var bLockListActions = (bIsWaterjet && bWaterjetStarted) || (bIsSterilization && bSterilizationOpen);
        this._setListActionsEnabled(oTable, oView, !bLockListActions);

    }.bind(this)).catch(function (oError) {
        console.log("[ButtonVisibility] failed:", oError);
    });
},

        _getOperationsState: function (oTable) {
            console.log("[Operations] _getOperationsState called");

            var oRowBinding = oTable.getRowBinding();
            console.log("[Operations] oRowBinding:", oRowBinding);

            if (!oRowBinding) {
                console.log("[Operations] no row binding, returning default");
                return Promise.resolve({ waterjetStarted: false, sterilizationOpen: false });
            }

            return oRowBinding.requestContexts(0, 1).then(function (aOpContexts) {
                console.log("[Operations] requestContexts resolved, count:", aOpContexts.length);

                if (aOpContexts.length === 0) {
                    console.log("[Operations] no rows, returning default");
                    return { waterjetStarted: false, sterilizationOpen: false };
                }

                console.log("[Operations] first row path:", aOpContexts[0].getPath());

                return aOpContexts[0].requestProperty(["UserStatusShortText", "NaploId"]).then(function () {
                    console.log("[Operations] requestProperty resolved successfully");

                    var sStatus = aOpContexts[0].getProperty("UserStatusShortText");
                    var sNaploId = aOpContexts[0].getProperty("NaploId");

                    console.log("[Operations] UserStatusShortText =", JSON.stringify(sStatus), "| typeof:", typeof sStatus);
                    console.log("[Operations] NaploId =", JSON.stringify(sNaploId), "| typeof:", typeof sNaploId);

                    var iNaploId = parseInt(sNaploId, 10) || 0;
                    var bWaterjetStarted = sStatus === "MFO";

                    console.log("[Operations] computed waterjetStarted =", bWaterjetStarted, "| sterilizationOpen =", iNaploId > 0);

                    return {
                        waterjetStarted: bWaterjetStarted,
                        sterilizationOpen: iNaploId > 0
                    };
                });
            }).catch(function (oError) {
                console.error("[Operations] state check error:", oError);
                console.error("[Operations] error message:", oError && oError.message);
                return { waterjetStarted: false, sterilizationOpen: false };
            });
        },

        _setListActionsEnabled: function (oTable, oView, bEnabled) {
            var aDeleteButtons = oTable.findAggregatedObjects(true, function (oControl) {
                return oControl.getId && oControl.getId().indexOf("deleteRow") > -1
                    && typeof oControl.setEnabled === "function";
            });
            aDeleteButtons.forEach(function (oButton) {
                oButton.setEnabled(bEnabled);
            });

            var aScanButtons = oTable.findAggregatedObjects(true, function (oControl) {
                return oControl.getId && oControl.getId().indexOf("scanBarcode") > -1
                    && typeof oControl.setEnabled === "function";
            });
            aScanButtons.forEach(function (oButton) {
                oButton.setEnabled(bEnabled);
            });
        }
    });
});