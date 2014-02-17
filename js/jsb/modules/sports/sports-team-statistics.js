/**
* @fileoverview JS functions for sports team statistics module
* @author tayjohnson@gannett.com
**/
define([
    'jquery',
    'underscore',
    'backbone',
    'modules/sports/sports-team-leaders'
],
function(
    $,
    _,
    Backbone,
    TeamLeaders
) {

    var TeamStatistics = TeamLeaders.extend({});

    return TeamStatistics;
});
