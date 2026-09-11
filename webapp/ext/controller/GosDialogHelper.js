sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/ObjectIdentifier",
    "sap/m/Button",
    "sap/m/Text"
], function (Dialog, Table, Column, ColumnListItem, ObjectIdentifier, Button, Text) {
    "use strict";

    // ====== Közös GOS dokumentum-dialógus - a SessionObjectPageExt és a ScanHandler is ezt hívja ======
    return {
        showDialog: function (oAnchorControl, aFilters, sDialogTitle) {
            var oTable = new Table({
                columns: [
                    new Column({ header: new Text({ text: "Leírás" }) }),
                    new Column({ header: new Text({ text: "Létrehozva" }) })
                ]
            });

            oTable.bindItems({
                path: "/GosUrlLink",
                model: "gosModel",
                filters: aFilters,
                parameters: {
                    $select: "GuidId,Description,CreatedOn,Url"
                },
                template: new ColumnListItem({
                    type: "Active",
                    press: function (oItemEvent) {
                        var oCtx = oItemEvent.getSource().getBindingContext("gosModel");
                        var sUrl = oCtx.getProperty("Url");
                        console.log(" -> sorra kattintva, URL:", sUrl);
                        window.open(sUrl, "_blank");
                    },
                    cells: [
                        new ObjectIdentifier({ title: "{gosModel>Description}" }),
                        new Text({ text: "{gosModel>CreatedOn}" })
                    ]
                }),
                events: {
                    dataReceived: function (oDataEvent) {
                        var oData = oDataEvent.getParameter("data");
                        var oErr = oDataEvent.getParameter("error");
                        if (oErr) {
                            console.error("### DEBUG: GosUrlLink hívás hiba ###", oErr);
                        } else {
                            console.log("### DEBUG: GosUrlLink válasz megérkezett ###", oData);
                        }
                    }
                }
            });

            var oDialog = new Dialog({
                title: sDialogTitle,
                contentWidth: "30rem",
                content: [oTable],
                beginButton: new Button({
                    text: "Bezár",
                    press: function () { oDialog.close(); }
                }),
                afterClose: function () { oDialog.destroy(); }
            });

            // az oAnchorControl-nak már a UI fán bent kell lennie (pl. a View maga),
            // hogy a dialógus örökölje a "gosModel"-t
            oAnchorControl.addDependent(oDialog);
            oDialog.open();
        }
    };
});