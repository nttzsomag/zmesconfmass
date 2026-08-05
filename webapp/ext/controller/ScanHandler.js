sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Dialog, Input, Button, MessageToast, MessageBox) {
    "use strict";
//klnlkhnk
    return {
        onScanBarcode: function (aContexts) {
            var oSessionContext = Array.isArray(aContexts) ? aContexts[0] : aContexts;

            if (!oSessionContext) {
                MessageBox.error("Nem található Session kontextus.");
                return;
            }

            var oModel = oSessionContext.getModel();

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