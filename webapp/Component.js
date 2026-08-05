sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("zmesconfmass.zmesconfmass.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);
                var sUser = sap.ushell.Container.getService("UserInfo").getId();
                this.getRouter().navTo("SessionObjectPage", {
                    key: "'" + sUser + "'",
                    IsActiveEntity: "true"
                });
            }

        });
    }
);