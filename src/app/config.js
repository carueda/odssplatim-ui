var odssplatimConfig = {

    // odssplatim-rest endpoint URL
    rest: "/odss/platim",

    // URL to get platform information
    platformsUrl: "/odss/platforms",

    helpLink: "https://oceana.mbari.org/confluence/display/CANON/ODSS+Platform+Timeline+Editor"

    , opts: {
        // lower and upper limits of visible range
        visRange: {
            min: "2013-01-01",
            max: "2015-12-31"
        },

        showHolidays: true,
        showWeekends: true
    }

    , useVis: true   // internal -- to be removed
};
