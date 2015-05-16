var odssplatimConfig = {

    // odssplatim-rest endpoint URL
    rest: "/odss/platim",

    // URL to get platform information
    platformsUrl: "/odss/platforms",

    helpLink: "https://oceana.mbari.org/confluence/display/CANON/ODSS+Platform+Timeline+Editor"

    , opts: {
        // lower and upper limits of visible range
        // TODO determine this dynamically, not fixed like this
        visRange: {
            min: "2014-01-01",
            max: "2017-12-31"
        },

        showHolidays: true,
        showWeekends: true

        // temporary flag while developing the new token types feature
        ,useSubgroups: false
    }
};
