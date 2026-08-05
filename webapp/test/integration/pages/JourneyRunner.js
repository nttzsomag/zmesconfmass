sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"zmesconfmass/zmesconfmass/test/integration/pages/SessionObjectPage.gen",
	"zmesconfmass/zmesconfmass/test/integration/pages/OperationObjectPage.gen"
], function (JourneyRunner, SessionObjectPageGenerated, OperationObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('zmesconfmass/zmesconfmass') + '/test/flp.html#app-preview',
        pages: {
			onTheSessionObjectPageGenerated: SessionObjectPageGenerated,
			onTheOperationObjectPageGenerated: OperationObjectPageGenerated
        },
        async: true
    });

    return runner;
});

