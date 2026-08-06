sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/ui/model/Filter"
], function (Dialog, Input, Button, MessageToast, MessageBox, SelectDialog, StandardListItem, Filter) {
    "use strict";

    // ====== Gép feloldása - üres lista esetén megkérdez, egyébként a meglévő sorból olvas vissza ======
    function resolveEquipment(oSessionContext, oModel) {
        var oOperationsBinding = oModel.bindList("_Operations", oSessionContext);

        return oOperationsBinding.requestContexts(0, 1).then(function (aOpContexts) {
            if (aOpContexts.length > 0) {
                // van már tétel a listán - az onnan érvényes gépet vesszük át, nem kérdezünk újra
                return aOpContexts[0].requestProperty("EquipmentId");
            }

            // üres a lista - munkahely alapján fel kell oldani a gépet
            return oSessionContext.requestProperty("WorkCenterId").then(function () {
                var sWorkCenterId = oSessionContext.getProperty("WorkCenterId");

                var oEquipmentBinding = oModel.bindList("/Equipment", null, [], [
                    new Filter("CrhdArbpl", "EQ", sWorkCenterId)
                ]);

                return oEquipmentBinding.requestContexts().then(function (aEquContexts) {
                    if (aEquContexts.length === 0) {
                        // Egyelőre nem minden munkahelyhez van gép rendelve - engedjük tovább.
                        // Ha ez a jövőben kötelezővé válik, itt lehet majd hibát dobni, pl.:
                        // MessageBox.error("Nincs gép rendelve ehhez a munkahelyhez!", { title: "Hiba" });
                        // return null; // ez blokkolná a scan-t
                        return undefined;
                    }

                    if (aEquContexts.length === 1) {
                        return aEquContexts[0].getObject().EquiEqunr;
                    }

                    // több gép - választódialógus, a scan csak választás után indulhat
                    return new Promise(function (resolve) {
                        var oDialog = new SelectDialog({
                            title: "Válasszon gépet",
                            items: aEquContexts.map(function (oCtx) {
                                var oEq = oCtx.getObject();
                                return new StandardListItem({
                                    title: oEq.EquiEqunr,
                                    description: oEq.EqktEqktx
                                });
                            }),
                            confirm: function (oEvent) {
                                var sSelected = oEvent.getParameter("selectedItem").getTitle();
                                oDialog.destroy();
                                resolve(sSelected);
                            },
                            cancel: function () {
                                oDialog.destroy();
                                resolve(null);
                            }
                        });
                        oDialog.open();
                    });
                });
            });
        }).catch(function (oError) {
            console.error("[Equipment] resolve error:", oError);
            MessageBox.error("Nem sikerült meghatározni a gépet.");
            return null;
        });
    }

    // ====== A barcode-beviteli dialógus - most már gép-paraméterrel ======
    function openBarcodeDialog(oModel, oSessionContext, sEquipmentId) {
        var oInput = new Input({
            placeholder: "Vonalkód beolvasása",
            submit: function () {
                oDialog.close();
                handleBarcode(oInput.getValue());
            }
        });

        var oDialog = new Dialog({
            title: "Beolvasás",
            content: [oInput],
            beginButton: new Button({
                text: "OK",
                press: function () {
                    oDialog.close();
                    handleBarcode(oInput.getValue());
                }
            }),
            endButton: new Button({
                text: "Mégse",
                press: function () { oDialog.close(); }
            }),
            afterClose: function () { oDialog.destroy(); }
        });

        oDialog.open();

        function handleBarcode(sBarcode) {
            if (!sBarcode) { return; }

            var oListBinding = oModel.bindList("_Operations", oSessionContext);
            var oHeaderContext = oListBinding.getHeaderContext();

            var oAction = oModel.bindContext(
                "com.sap.gateway.srvd.zui_mes_pp_massconf.v0001.createByBarcode(...)",
                oHeaderContext
            );
            oAction.setParameter("barcode_value", sBarcode);
            oAction.setParameter("equipment_id", sEquipmentId);
            oAction.execute().then(function () {
                return oAction.getBoundContext().requestObject();
            }).then(function (oResult) {
                var iCount = oResult && oResult.value ? oResult.value.length : 0;

                if (iCount === 0) {
                    MessageBox.error("Nincs ilyen vonalkód, vagy nem sikerült felvinni.");
                    return;
                }

                MessageToast.show(iCount + " tétel hozzáadva.");
                return oSessionContext.requestSideEffects([{ $NavigationPropertyPath: "_Operations" }]);
            }).catch(function (oError) {
                MessageBox.error("Hiba a felvitel közben: " + oError.message);
            });
        }
    }

    return {
        onScanBarcode: function (aContexts) {
            var oSessionContext = Array.isArray(aContexts) ? aContexts[0] : aContexts;

            if (!oSessionContext) {
                MessageBox.error("Nem található Session kontextus.");
                return;
            }

            var oModel = oSessionContext.getModel();

            resolveEquipment(oSessionContext, oModel).then(function (sEquipmentId) {
                if (sEquipmentId === null) {
                    // user Mégse-t nyomott a gép-választó dialóguson - ne folytatódjon a scan v
                    return;
                }
                // sEquipmentId lehet undefined (nincs gép rendelve) - egyelőre engedjük tovább
                openBarcodeDialog(oModel, oSessionContext, sEquipmentId);
            });
        },

        onDeleteRow: function (oTableContext, aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageBox.error("Nincs kijelölt sor.");
                return;
            }

            MessageBox.confirm("Biztosan törlöd a kijelölt tétel(eke)t?", {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    var aPromises = aSelectedContexts.map(function (oContext) {
                        return oContext.delete("$auto");
                    });

                    Promise.all(aPromises).then(function () {
                        MessageToast.show("Törölve.");
                    }).catch(function (oError) {
                        MessageBox.error("Hiba törlés közben: " + oError.message);
                    });
                }
            });
        }
    };
});