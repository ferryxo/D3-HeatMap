var $ = require("jquery")
var d3 = require("d3")
var HashMap = require("hashmap")

var margin = {
        top: 100,
        right: 0,
        bottom: 100,
        left: 140
    },
    width = $("#chart").parent().width() - margin.left - margin.right,
    height = $("#chart").parent().height() - margin.top - margin.bottom,
    gridSize = Math.floor(width / 12),
    legendElementWidth = gridSize * 1.25,
    colors = [
        "#C0392B",
        "#E74C3C",
        "#F39C12",
        "#F4D03F"
        // "#ABEBC6",
        // "#58D68D",
        // "#239B56",
        // "#0E6655",
        // "#154360"
    ],
    h_labels = [],
    v_labels = [],
    default_value = null,
    default_color = null,
    color_ranges = [],
    range_hashmap = new HashMap(),
    uniqueValues = [],
    default_value = null,
    default_color = null,
    minimum_value = null,
    minimum_color = null,
    maximum_value = null,
    maximum_color = null;

$.getJSON("data.json", function(data) {
    //console.log(data);
    h_labels = data.h_labels;
    v_labels = data.v_labels;
    color_ranges = data.color_scheme.ranges;
    uniqueValues = get_range_values(data.color_scheme.ranges);

    default_value = data.color_scheme.default_value;
    default_color = data.color_scheme.default_color;
    minimum_value = uniqueValues[0]
    minimum_color = getRangeWhereMinimumIs(minimum_value, color_ranges);
    maximum_value = uniqueValues[uniqueValues.length - 1];
    maximum_color = getRangeWhereMaximumIs(maximum_value, color_ranges);

    uniqueValues.splice(0, 1);

    var iterator = null;
    for (var i = 0; i < uniqueValues.length; i++) {
        for (var j = 0; j < color_ranges.length; j++) {
            if (uniqueValues[i] === color_ranges[j].maximum) {
                range_hashmap[uniqueValues[i]] = color_ranges[j];
                break;
            }
        }
    }
    console.log(range_hashmap);
    loadChart(data);
});

function getRangeWhereMinimumIs(value, color_ranges) {
    console.log(color_ranges);
    for (var i = 0; i < color_ranges.length; i++) {
        console.log(color_ranges[i].minimum);
        if (color_ranges[i].minimum === value) {
            return color_ranges[i];
        }
    }
    alert("Data related to ranges is not passed correctly.");
    return null;
}

function getRangeWhereMaximumIs(value, color_ranges) {
    var range = null;
    for (var i = 0; i < color_ranges.length; i++) {
        console.log(color_ranges[i].maximum);
        if (color_ranges[i].maximum === value) {
            return color_ranges[i];
        }
    }
    alert("Data related to ranges is not passed correctly.");
    return null;
}

function get_range_values(ranges) {
    //console.log(ranges);
    values = []
    for (var i = 0; i < ranges.length; i++) {
        //console.log(ranges[i])
        values.push(ranges[i].minimum)
        values.push(ranges[i].maximum)
    }
    var uniqueValues = [];
    $.each(values, function(i, el) {
        if ($.inArray(el, uniqueValues) === -1)
            uniqueValues.push(el);
    });
    return uniqueValues;
}

function loadChart(data) {
    var svg = d3.select("#chart").append("svg").attr("width", width).attr("height", height).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Define the div for the tooltip
    var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    var courseLabels = svg.selectAll(".courseLabel").data(v_labels).enter().append("text").text(function(d) {
        return d;
    }).attr("x", 0).attr("y", function(d, i) {
        return i * gridSize;
    }).style("text-anchor", "end").style("margin-right", "5px").attr("transform", "translate(-6," + gridSize / 1.5 + ")").attr("class", function(d, i) {
        return ((i >= 0 && i <= 7) ?
            "courseLabel mono axis axis-workweek" :
            "courseLabel mono axis");
    });

    var x = d3.scale.linear().domain([
        0, gridSize * h_labels.length
    ]).range([
        0, gridSize * h_labels.length
    ]);

    var xAxis = d3.svg.axis(x)
        .tickValues([
            gridSize * 0,
            gridSize * 1,
            gridSize * 2,
            gridSize * 3,
            gridSize * 4,
            gridSize * 5,
            gridSize * 6
        ]).tickFormat(function(d, i) {
            return h_labels[i];
        });

    svg.append("g").attr("class", "x axis").call(xAxis).selectAll("text").attr("class", "mono").style("font-weight", "bold").style("text-anchor", "start").attr("dx", "2.25em").attr("dy", "0.4em").attr("transform", "rotate(-45)");

    var heatmapChart = function() {
        raw_data = data.content;
        data = [];
        for (var i = 0; i < raw_data.length; i++) {
            for (var j = 0; j < raw_data.length; j++) {
                data.push({
                    "x": i,
                    "y": j,
                    "text": raw_data[i][j].text,
                    "value": raw_data[i][j].value
                });
            }
        }

        console.log(data);
        // var colorScale = d3.scale.linear().domain([
        //     0,
        //     25,
        //     50,
        //     75,
        //     100
        // ]).range(colors);

        var cards = svg.selectAll(".assignment").data(data);

        cards.append("title");

        cards.enter().append("rect").attr("x", function(d) {
            return (d.x) * gridSize;
        }).attr("y", function(d) {
            return (d.y) * gridSize;
        }).attr("rx", 4).attr("ry", 4).attr("class", "hour bordered").attr("width", gridSize).attr("height", gridSize).style("fill", colors[0]).on("mouseover", function(d) {
            div.transition().duration(200).style("opacity", .65);
            div.html(d.text + "<br/>").style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 28) + "px");
        }).on("mouseout", function(d) {
            div.transition().duration(500).style("opacity", 0);
        });

        cards.transition().duration(1000).style("fill", function(d) {
            return get_fill_color(d.value);
        });

        cards.select("title").text(function(d) {
            return d.value;
        });

        cards.exit().remove();

        function get_fill_color(value) {
            return colors[0];
        }

        // var legend = svg.selectAll(".legend").data(colorScale.domain());
        //
        // legend.enter().append("g").attr("class", "legend");
        //
        // legend.append("rect").attr("x", function(d, i) {
        //     return legendElementWidth * i;
        // }).attr("y", height).attr("width", legendElementWidth).attr("height", gridSize / 2).style("fill", function(d, i) {
        //     return colors[i];
        // });
        //
        // legend.append("text").attr("class", "mono").text(function(d) {
        //     return "≥ " + Math.round(d);
        // }).attr("x", function(d, i) {
        //     return legendElementWidth * i;
        // }).attr("y", height + gridSize);
        //
        // legend.exit().remove();
    };
    heatmapChart();
}
